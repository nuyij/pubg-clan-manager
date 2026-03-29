// PUBG API — Supabase Edge Function 프록시 경유 (CORS 우회)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// 집계 대상 게임 모드 (카카오 서버 기준)
// squad = 경쟁전, squad-fpp = 경쟁전 1인칭
const ALLOWED_GAME_MODES = ['squad', 'squad-fpp']

async function pubgFetch(path) {
  const url = `${SUPABASE_URL}/functions/v1/pubg-proxy?path=${encodeURIComponent(path)}`
  let res
  try {
    res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    throw new Error(`네트워크 오류: Edge Function에 연결할 수 없습니다. (${e.message})`)
  }
  let data
  try { data = await res.json() } catch { throw new Error(`응답 파싱 오류: HTTP ${res.status}`) }
  if (!res.ok) {
    const msg = data?.errors?.[0]?.title ?? data?.error ?? `HTTP ${res.status}`
    if (res.status === 404) throw new Error(`플레이어를 찾을 수 없습니다: ${msg}`)
    if (res.status === 401) throw new Error(`PUBG API 키가 유효하지 않습니다.`)
    if (res.status === 429) throw new Error(`API 호출 한도 초과. 잠시 후 다시 시도하세요.`)
    throw new Error(msg)
  }
  return data
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export async function getPlayersByNames(playerNames) {
  if (!playerNames.length) return []
  const data = await pubgFetch(`/players?filter[playerNames]=${encodeURIComponent(playerNames.join(','))}`)
  return data.data ?? []
}

export async function getPlayerByName(playerName) {
  return (await getPlayersByNames([playerName]))[0] ?? null
}

export async function getPlayerRecentMatches(accountId) {
  const data = await pubgFetch(`/players/${accountId}`)
  return (data.data?.relationships?.matches?.data ?? []).map(m => m.id)
}

export async function getMatchDetail(matchId) {
  return await pubgFetch(`/matches/${matchId}`)
}

export function parseMatchData(matchJson) {
  const included = matchJson.included ?? []
  const participants = new Map()
  for (const item of included) {
    if (item.type !== 'participant') continue
    const s = item.attributes.stats
    participants.set(item.id, {
      participantId: item.id,
      playerId: s.playerId,
      name: s.name,
      kills: s.kills ?? 0,
      assists: s.assists ?? 0,
      damage: s.damageDealt ?? 0,
      survivalTime: s.timeSurvived ?? 0,
      winPlace: s.winPlace ?? 100,
    })
  }
  const rosters = []
  for (const item of included) {
    if (item.type !== 'roster') continue
    const memberIds = item.relationships.participants.data.map(p => p.id)
    rosters.push({
      rosterId: item.id,
      rank: item.attributes.stats.rank ?? 100,
      members: memberIds.map(id => participants.get(id)).filter(Boolean),
    })
  }
  return { participants, rosters, totalPlayers: participants.size }
}

/**
 * 단일 매치 처리 로직 (일반 갱신 + match_id 직접 입력 공통 사용)
 */
function processOneMatch({ matchJson, matchId, accountIdToMember, accountIdToPubgName, settings, seasonRange }) {
  const results = []
  const records = []

  const matchCreatedAt = matchJson.data?.attributes?.createdAt
  const gameMode = matchJson.data?.attributes?.gameMode ?? ''

  // 허용 모드 필터
  if (ALLOWED_GAME_MODES && !ALLOWED_GAME_MODES.includes(gameMode)) {
    return { results, records, skipped: true, reason: `게임모드 제외 (${gameMode})` }
  }

  // 시즌 기간 필터
  if (seasonRange && matchCreatedAt) {
    const t = new Date(matchCreatedAt).getTime()
    if (t < new Date(seasonRange.start).getTime() || t > new Date(seasonRange.end).getTime()) {
      return { results, records, skipped: true, reason: '시즌 기간 외' }
    }
  }

  const { rosters, totalPlayers } = parseMatchData(matchJson)

  for (const roster of rosters) {
    const clanMems = roster.members.filter(p => accountIdToMember.has(p.playerId))
    if (!clanMems.length) continue

    // 동일 멤버 중복 제거 (다중 계정 대리플레이 등)
    const seenMemberIds = new Set()
    const dedupedClanMems = clanMems.filter(p => {
      const member = accountIdToMember.get(p.playerId)
      if (!member || seenMemberIds.has(member.id)) return false
      seenMemberIds.add(member.id)
      return true
    })

    const isParty = dedupedClanMems.length >= 2
    const hasNewbie = dedupedClanMems.some(p => {
      const m = accountIdToMember.get(p.playerId)
      return m && (m.status === '신규' || m.status === '텟생')
    })

    let contribution = 0
    if (isParty) {
      const totalSurvivalTime = dedupedClanMems.reduce((sum, p) => sum + p.survivalTime, 0)
      const multiplier = hasNewbie ? (settings.newbie_bonus ?? 1.5) : 1.0
      contribution = Math.floor((totalSurvivalTime / 60) * multiplier * dedupedClanMems.length)
    }

    const partyMemberNames = dedupedClanMems.map(p =>
      accountIdToPubgName.get(p.playerId) ?? p.name
    )

    for (const participant of dedupedClanMems) {
      const member = accountIdToMember.get(participant.playerId)
      const pubgName = accountIdToPubgName.get(participant.playerId) ?? member?.pubg_name
      if (!member || !pubgName) continue

      const rankScore = settings.rank_scores?.[String(roster.rank)] ?? 0
      const bestPlayer =
        participant.kills * (settings.kill_weight ?? 10) +
        participant.assists * (settings.assist_weight ?? 5) +
        rankScore

      results.push({
        pubg_name: pubgName,
        member_id: member.id,
        matchId, matchCreatedAt,
        kills: participant.kills,
        assists: participant.assists,
        damage: participant.damage,
        survivalTime: participant.survivalTime,
        winPlace: roster.rank,
        contributionPoints: contribution,
        bestPlayerPoints: bestPlayer,
      })

      records.push({
        match_id: matchId,
        pubg_name: pubgName,
        member_id: member.id,
        played_at: matchCreatedAt,
        kills: participant.kills,
        assists: participant.assists,
        damage: participant.damage,
        survival_time: participant.survivalTime,
        win_place: roster.rank,
        total_players: totalPlayers,
        contribution: contribution,
        best_player_pts: bestPlayer,
        is_party: isParty,
        party_size: dedupedClanMems.length,
        party_members: partyMemberNames.filter(n => n !== pubgName),
      })
    }
  }

  return { results, records, skipped: false }
}

/**
 * 일반 자동 갱신 (최근 20경기 기준)
 */
export async function syncAllMatches({ members, settings, processedMatchIds, seasonRange, onProgress }) {
  const results = []
  const records = []
  const errors = []

  onProgress?.('플레이어 정보 조회 중...')

  const allPubgNames = []
  for (const m of members) {
    if (m.pubg_accounts?.length) m.pubg_accounts.forEach(a => { if (a.pubg_name) allPubgNames.push(a.pubg_name) })
    else if (m.pubg_name) allPubgNames.push(m.pubg_name)
  }
  if (!allPubgNames.length) throw new Error('등록된 배그 ID가 없습니다.')

  let pubgPlayers = []
  for (let i = 0; i < allPubgNames.length; i += 10) {
    try {
      const players = await getPlayersByNames(allPubgNames.slice(i, i + 10))
      pubgPlayers.push(...players)
      if (i + 10 < allPubgNames.length) await delay(400)
    } catch (e) { throw new Error('플레이어 조회 실패: ' + e.message) }
  }

  const nameToAccountId = new Map()
  for (const p of pubgPlayers) nameToAccountId.set(p.attributes.name.toLowerCase(), p.id)

  const accountIdToMember = new Map()
  const accountIdToPubgName = new Map()
  for (const m of members) {
    const names = m.pubg_accounts?.length
      ? m.pubg_accounts.map(a => a.pubg_name).filter(Boolean)
      : m.pubg_name ? [m.pubg_name] : []
    for (const name of names) {
      const accountId = nameToAccountId.get(name.toLowerCase())
      if (accountId) { accountIdToMember.set(accountId, m); accountIdToPubgName.set(accountId, name) }
      else errors.push(`닉네임 불일치 또는 비공개: ${name}`)
    }
  }
  if (!accountIdToMember.size) throw new Error('PUBG에서 조회된 클랜원이 없습니다.')

  onProgress?.('최근 매치 목록 수집 중...')
  const allMatchIds = new Set()
  let idx = 0
  for (const [accountId] of accountIdToMember) {
    try {
      const ids = await getPlayerRecentMatches(accountId)
      ids.slice(0, 20).forEach(id => allMatchIds.add(id))
    } catch (e) { errors.push(`매치 목록 조회 실패: ${e.message}`) }
    idx++
    if (idx < accountIdToMember.size) await delay(400)
  }

  const newMatchIds = [...allMatchIds].filter(id => !processedMatchIds.has(id))
  if (!newMatchIds.length) return { results: [], records: [], errors, processedCount: 0, message: '새로운 매치가 없습니다' }

  onProgress?.(`신규 매치 ${newMatchIds.length}개 처리 중...`)
  let skippedCount = 0

  for (let i = 0; i < newMatchIds.length; i++) {
    const matchId = newMatchIds[i]
    onProgress?.(`매치 처리 중 (${i + 1}/${newMatchIds.length})`)
    try {
      const matchJson = await getMatchDetail(matchId)
      const { results: r, records: rec, skipped, reason } = processOneMatch({
        matchJson, matchId, accountIdToMember, accountIdToPubgName, settings, seasonRange
      })
      if (skipped) { skippedCount++; }
      else { results.push(...r); records.push(...rec) }
      processedMatchIds.add(matchId)
    } catch (e) {
      errors.push(`매치 ${matchId.slice(0, 8)}: ${e.message}`)
    }
    if (i < newMatchIds.length - 1) await delay(250)
  }

  return {
    results, records, errors,
    processedCount: newMatchIds.length,
    skippedCount,
    message: skippedCount > 0 ? `경쟁전 외 ${skippedCount}개 제외됨` : ''
  }
}

/**
 * match_id 직접 입력 처리
 * 시즌 누락 매치 보완용
 */
export async function syncMatchIds({ matchIds, members, settings, processedMatchIds, seasonRange, onProgress }) {
  const results = []
  const records = []
  const errors = []
  const skipped = []
  const alreadyProcessed = []

  onProgress?.('플레이어 정보 조회 중...')

  const allPubgNames = []
  for (const m of members) {
    if (m.pubg_accounts?.length) m.pubg_accounts.forEach(a => { if (a.pubg_name) allPubgNames.push(a.pubg_name) })
    else if (m.pubg_name) allPubgNames.push(m.pubg_name)
  }

  let pubgPlayers = []
  for (let i = 0; i < allPubgNames.length; i += 10) {
    try {
      const players = await getPlayersByNames(allPubgNames.slice(i, i + 10))
      pubgPlayers.push(...players)
      if (i + 10 < allPubgNames.length) await delay(400)
    } catch (e) { throw new Error('플레이어 조회 실패: ' + e.message) }
  }

  const nameToAccountId = new Map()
  for (const p of pubgPlayers) nameToAccountId.set(p.attributes.name.toLowerCase(), p.id)

  const accountIdToMember = new Map()
  const accountIdToPubgName = new Map()
  for (const m of members) {
    const names = m.pubg_accounts?.length
      ? m.pubg_accounts.map(a => a.pubg_name).filter(Boolean)
      : m.pubg_name ? [m.pubg_name] : []
    for (const name of names) {
      const accountId = nameToAccountId.get(name.toLowerCase())
      if (accountId) { accountIdToMember.set(accountId, m); accountIdToPubgName.set(accountId, name) }
    }
  }

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = matchIds[i].trim()
    if (!matchId) continue

    onProgress?.(`매치 처리 중 (${i + 1}/${matchIds.length}): ${matchId.slice(0, 12)}...`)

    // 이미 처리된 매치
    if (processedMatchIds.has(matchId)) {
      alreadyProcessed.push(matchId)
      continue
    }

    try {
      const matchJson = await getMatchDetail(matchId)
      const { results: r, records: rec, skipped: s, reason } = processOneMatch({
        matchJson, matchId, accountIdToMember, accountIdToPubgName, settings, seasonRange
      })
      if (s) skipped.push({ matchId, reason })
      else { results.push(...r); records.push(...rec) }
      processedMatchIds.add(matchId)
    } catch (e) {
      errors.push(`${matchId.slice(0, 12)}: ${e.message}`)
    }
    if (i < matchIds.length - 1) await delay(300)
  }

  return { results, records, errors, skipped, alreadyProcessed, processedCount: matchIds.length }
}
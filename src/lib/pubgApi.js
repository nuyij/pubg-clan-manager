// PUBG API — Supabase Edge Function 프록시 경유 (CORS 우회)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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
  return { participants, rosters }
}

export async function syncAllMatches({ members, settings, processedMatchIds, seasonRange, onProgress }) {
  const results = []
  const errors = []

  onProgress?.('플레이어 정보 조회 중...')

  const allPubgNames = []
  for (const m of members) {
    if (m.pubg_accounts?.length) m.pubg_accounts.forEach(a => { if (a.pubg_name) allPubgNames.push(a.pubg_name) })
    else if (m.pubg_name) allPubgNames.push(m.pubg_name)
  }
  if (!allPubgNames.length) throw new Error('등록된 배그 ID가 없습니다. 배그 ID를 먼저 등록해주세요.')

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
    const names = m.pubg_accounts?.length ? m.pubg_accounts.map(a => a.pubg_name).filter(Boolean) : m.pubg_name ? [m.pubg_name] : []
    for (const name of names) {
      const accountId = nameToAccountId.get(name.toLowerCase())
      if (accountId) { accountIdToMember.set(accountId, m); accountIdToPubgName.set(accountId, name) }
      else errors.push(`닉네임 불일치 또는 비공개: ${name}`)
    }
  }
  if (!accountIdToMember.size) throw new Error('PUBG에서 조회된 클랜원이 없습니다. 배그 ID를 확인해주세요.')

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
  if (!newMatchIds.length) return { results: [], errors, processedCount: 0, message: '새로운 매치가 없습니다' }

  onProgress?.(`신규 매치 ${newMatchIds.length}개 처리 중...`)

  for (let i = 0; i < newMatchIds.length; i++) {
    const matchId = newMatchIds[i]
    onProgress?.(`매치 처리 중 (${i + 1}/${newMatchIds.length})`)
    try {
      const matchJson = await getMatchDetail(matchId)
      const matchCreatedAt = matchJson.data?.attributes?.createdAt

      if (seasonRange && matchCreatedAt) {
        const t = new Date(matchCreatedAt).getTime()
        if (t < new Date(seasonRange.start).getTime() || t > new Date(seasonRange.end).getTime()) {
          processedMatchIds.add(matchId); continue
        }
      }

      const { rosters } = parseMatchData(matchJson)

      for (const roster of rosters) {
        const clanMems = roster.members.filter(p => accountIdToMember.has(p.playerId))
        if (!clanMems.length) continue

        const isParty = clanMems.length >= 2

        // ✅ 기여도: 파티일 때만, 생존시간 합산 기반
        // 공식: 파티 클랜원 생존시간 합(초) × 가산율
        // → 오래 같이 살아있을수록 높은 기여도
        let contribution = 0
        if (isParty) {
          const hasNewbie = clanMems.some(p => {
            const m = accountIdToMember.get(p.playerId)
            return m && (m.status === '신규' || m.status === '텟생')
          })
          const totalSurvivalTime = clanMems.reduce((sum, p) => sum + p.survivalTime, 0)
          const multiplier = hasNewbie ? (settings.newbie_bonus ?? 1.5) : 1.0
          // 초 단위 → 분 단위로 환산 후 점수화 (1분 = 1점 기본, 인원 가중)
          contribution = Math.floor((totalSurvivalTime / 60) * multiplier * clanMems.length)
        }

        for (const participant of clanMems) {
          const member = accountIdToMember.get(participant.playerId)
          const pubgName = accountIdToPubgName.get(participant.playerId) ?? member?.pubg_name
          if (!member || !pubgName) continue

          const rankScore = settings.rank_scores?.[String(roster.rank)] ?? 0
          // 베스트플레이어·최장플레이어는 혼자 게임해도 항상 기록
          const bestPlayer =
            participant.kills * (settings.kill_weight ?? 10) +
            participant.assists * (settings.assist_weight ?? 5) +
            rankScore

          results.push({
            pubg_name: pubgName,
            matchId, matchCreatedAt,
            kills: participant.kills,
            assists: participant.assists,
            damage: participant.damage,
            survivalTime: participant.survivalTime,
            winPlace: roster.rank,
            contributionPoints: contribution,
            bestPlayerPoints: bestPlayer,
          })
        }
      }

      processedMatchIds.add(matchId)
    } catch (e) {
      errors.push(`매치 ${matchId.slice(0, 8)}: ${e.message}`)
    }
    if (i < newMatchIds.length - 1) await delay(250)
  }
  return { results, errors, processedCount: newMatchIds.length }
}

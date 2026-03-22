import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PUBG_API_KEY = Deno.env.get('PUBG_API_KEY') ?? ''
const PUBG_BASE = 'https://api.pubg.com/shards/steam'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

async function pubgFetch(path: string) {
  const res = await fetch(`${PUBG_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${PUBG_API_KEY}`, 'Accept': 'application/vnd.api+json' }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.errors?.[0]?.title ?? `HTTP ${res.status}`)
  }
  return res.json()
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const log: string[] = []
  const errors: string[] = []

  try {
    // 1. 자동갱신 활성화 여부 확인
    const { data: settings } = await supabase.from('settings').select('*').single()
    if (!settings?.auto_sync_enabled) {
      return new Response(JSON.stringify({ message: '자동 갱신이 비활성화 상태입니다' }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // 2. 현재 시즌 조회
    const { data: activeSeason } = await supabase
      .from('seasons').select('*').eq('is_active', true).single()

    // 3. 처리된 매치 ID 로드
    const { data: history } = await supabase.from('match_history').select('match_id')
    const processedIds = new Set((history ?? []).map((h: any) => h.match_id))

    // 4. 멤버 + 배그 계정 로드
    const { data: members } = await supabase.from('members').select('*')
    const { data: allAccounts } = await supabase.from('member_pubg_accounts').select('*')

    const accountMap: Record<string, any[]> = {}
    for (const acc of (allAccounts ?? [])) {
      if (!accountMap[acc.member_id]) accountMap[acc.member_id] = []
      accountMap[acc.member_id].push(acc)
    }
    const membersWithAccounts = (members ?? []).map((m: any) => ({
      ...m,
      pubg_accounts: accountMap[m.id] ?? (m.pubg_name ? [{ pubg_name: m.pubg_name }] : [])
    }))

    // 5. 모든 배그 닉네임 수집
    const allNames: string[] = []
    for (const m of membersWithAccounts) {
      for (const a of m.pubg_accounts) { if (a.pubg_name) allNames.push(a.pubg_name) }
    }
    if (!allNames.length) throw new Error('등록된 배그 ID 없음')

    // 6. PUBG accountId 조회
    const pubgPlayers: any[] = []
    for (let i = 0; i < allNames.length; i += 10) {
      const chunk = allNames.slice(i, i + 10)
      try {
        const data = await pubgFetch(`/players?filter[playerNames]=${encodeURIComponent(chunk.join(','))}`)
        pubgPlayers.push(...(data.data ?? []))
      } catch(e: any) { errors.push(`플레이어 조회 실패: ${e.message}`) }
      if (i + 10 < allNames.length) await delay(400)
    }

    const nameToAccountId = new Map<string, string>()
    for (const p of pubgPlayers) nameToAccountId.set(p.attributes.name.toLowerCase(), p.id)

    const accountIdToMember = new Map<string, any>()
    const accountIdToPubgName = new Map<string, string>()
    for (const m of membersWithAccounts) {
      for (const a of m.pubg_accounts) {
        const id = nameToAccountId.get(a.pubg_name?.toLowerCase())
        if (id) { accountIdToMember.set(id, m); accountIdToPubgName.set(id, a.pubg_name) }
      }
    }

    // 7. 최근 매치 수집
    const allMatchIds = new Set<string>()
    let idx = 0
    for (const [accountId] of accountIdToMember) {
      try {
        const data = await pubgFetch(`/players/${accountId}`)
        const ids = (data.data?.relationships?.matches?.data ?? []).map((m: any) => m.id)
        ids.slice(0, 20).forEach((id: string) => allMatchIds.add(id))
      } catch(e: any) { errors.push(`매치 목록 조회 실패: ${e.message}`) }
      idx++
      if (idx < accountIdToMember.size) await delay(400)
    }

    const newMatchIds = [...allMatchIds].filter(id => !processedIds.has(id))
    log.push(`신규 매치 ${newMatchIds.length}개 처리 시작`)

    // 8. 매치 처리 및 점수 계산
    const seasonStart = activeSeason?.started_at
    const results: any[] = []

    for (let i = 0; i < newMatchIds.length; i++) {
      const matchId = newMatchIds[i]
      try {
        const matchJson = await pubgFetch(`/matches/${matchId}`)
        const matchCreatedAt = matchJson.data?.attributes?.createdAt

        // 시즌 기간 필터
        if (seasonStart && matchCreatedAt) {
          const t = new Date(matchCreatedAt).getTime()
          if (t < new Date(seasonStart).getTime()) { processedIds.add(matchId); continue }
        }

        // 파싱
        const included = matchJson.included ?? []
        const participants = new Map<string, any>()
        for (const item of included) {
          if (item.type !== 'participant') continue
          const s = item.attributes.stats
          participants.set(item.id, {
            playerId: s.playerId, name: s.name,
            kills: s.kills ?? 0, assists: s.assists ?? 0,
            damage: s.damageDealt ?? 0, survivalTime: s.timeSurvived ?? 0,
            winPlace: s.winPlace ?? 100,
          })
        }
        for (const item of included) {
          if (item.type !== 'roster') continue
          const rank = item.attributes.stats.rank ?? 100
          const memberIds = item.relationships.participants.data.map((p: any) => p.id)
          const rosterMembers = memberIds.map((id: string) => participants.get(id)).filter(Boolean)
          const clanMems = rosterMembers.filter((p: any) => accountIdToMember.has(p.playerId))
          if (!clanMems.length) continue

          const isParty = clanMems.length >= 2
          const hasNewbie = clanMems.some((p: any) => {
            const m = accountIdToMember.get(p.playerId)
            return m && (m.status === '신규' || m.status === '텟생')
          })
          const contribution = isParty
            ? Math.floor(clanMems.length * 10 * (hasNewbie ? (settings.newbie_bonus ?? 1.5) : 1.0))
            : 0

          for (const p of clanMems) {
            const member = accountIdToMember.get(p.playerId)
            const pubgName = accountIdToPubgName.get(p.playerId) ?? member?.pubg_name
            if (!member || !pubgName) continue
            const rankScore = settings.rank_scores?.[String(rank)] ?? 0
            const bestPlayer = p.kills * (settings.kill_weight ?? 10) + p.assists * (settings.assist_weight ?? 5) + rankScore
            results.push({
              pubg_name: pubgName, member_id: member.id, matchId,
              kills: p.kills, assists: p.assists, damage: p.damage,
              survivalTime: p.survivalTime, winPlace: rank,
              contributionPoints: contribution, bestPlayerPoints: bestPlayer,
            })
          }
        }
        processedIds.add(matchId)
      } catch(e: any) { errors.push(`매치 ${matchId.slice(0,8)}: ${e.message}`) }
      if (i < newMatchIds.length - 1) await delay(250)
    }

    // 9. 점수 저장
    for (const r of results) {
      await supabase.rpc('upsert_match_data', {
        p_pubg_name: r.pubg_name, p_member_id: r.member_id,
        p_season_id: activeSeason?.id ?? null,
        p_kills: r.kills, p_assists: r.assists, p_damage: r.damage,
        p_survival_time: r.survivalTime, p_is_win: r.winPlace === 1 ? 1 : 0,
        p_contribution: r.contributionPoints, p_best_player: r.bestPlayerPoints,
      })
    }

    // 10. match_history 저장 + 갱신 시각 업데이트
    const newIds = newMatchIds.filter(id => !(history ?? []).some((h: any) => h.match_id === id))
    if (newIds.length) {
      await supabase.from('match_history').insert(
        newIds.map(id => ({ match_id: id, season_id: activeSeason?.id ?? null }))
      )
    }
    await supabase.from('settings').update({ last_synced_at: new Date().toISOString() }).eq('id', 1)

    log.push(`완료: 매치 ${newMatchIds.length}개 처리, 점수 ${results.length}건 저장, 오류 ${errors.length}건`)

    return new Response(JSON.stringify({ success: true, log, errors }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch(e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message, errors }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
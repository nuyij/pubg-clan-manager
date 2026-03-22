import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useRankingStore = defineStore('ranking', () => {
  const matchData = ref([])   // 원본 (pubg_name별)
  const memberData = ref([])  // 멤버별 합산 결과
  const members = ref([])
  const loading = ref(false)
  const useSample = ref(false)

  const sampleData = [
    { display_name: '테스트유저1', total_kills: 45, total_assists: 23, total_damage: 18500, total_survival_time: 72000, total_wins: 3, total_games: 12, contribution_points: 180, best_player_points: 620 },
    { display_name: '테스트유저2', total_kills: 38, total_assists: 31, total_damage: 15200, total_survival_time: 85000, total_wins: 5, total_games: 15, contribution_points: 240, best_player_points: 535 },
    { display_name: '테스트유저3', total_kills: 52, total_assists: 18, total_damage: 21000, total_survival_time: 61000, total_wins: 2, total_games: 10, contribution_points: 120, best_player_points: 700 },
    { display_name: '테스트유저4', total_kills: 21, total_assists: 40, total_damage: 9800,  total_survival_time: 93000, total_wins: 6, total_games: 18, contribution_points: 310, best_player_points: 410 },
    { display_name: '테스트유저5', total_kills: 30, total_assists: 25, total_damage: 12300, total_survival_time: 54000, total_wins: 1, total_games: 8,  contribution_points: 90,  best_player_points: 455 },
  ]

  // match_data(pubg_name별)를 멤버 기준으로 합산
  // member_id가 있으면 멤버로 묶고, 없으면 pubg_name 그대로 표시
  function aggregateByMember(rawData, membersList) {
    const memberMap = new Map() // member_id → 합산 데이터

    for (const row of rawData) {
      const member = membersList.find(m => m.id === row.member_id)
      const key = row.member_id ?? row.pubg_name
      const displayName = member?.clan_nickname ?? member?.pubg_name ?? row.pubg_name

      if (!memberMap.has(key)) {
        memberMap.set(key, {
          member_id: row.member_id,
          display_name: displayName,
          pubg_name: row.pubg_name, // 대표 배그ID
          total_kills: 0,
          total_assists: 0,
          total_damage: 0,
          total_survival_time: 0,
          total_wins: 0,
          total_games: 0,
          contribution_points: 0,
          best_player_points: 0,
          pubg_names: [], // 합산된 배그ID 목록
        })
      }

      const agg = memberMap.get(key)
      agg.total_kills         += row.total_kills ?? 0
      agg.total_assists       += row.total_assists ?? 0
      agg.total_damage        += row.total_damage ?? 0
      agg.total_survival_time += row.total_survival_time ?? 0
      agg.total_wins          += row.total_wins ?? 0
      agg.total_games         += row.total_games ?? 0
      agg.contribution_points += row.contribution_points ?? 0
      agg.best_player_points  += row.best_player_points ?? 0
      agg.pubg_names.push(row.pubg_name)
    }

    return [...memberMap.values()]
  }

  const activeData = computed(() =>
    useSample.value ? sampleData : memberData.value
  )

  const contributionRanking = computed(() =>
    [...activeData.value]
      .sort((a, b) => b.contribution_points - a.contribution_points)
      .map((item, i) => ({ ...item, rank: i + 1 }))
  )
  const bestPlayerRanking = computed(() =>
    [...activeData.value]
      .sort((a, b) => b.best_player_points - a.best_player_points)
      .map((item, i) => ({ ...item, rank: i + 1 }))
  )
  const mostTimeRanking = computed(() =>
    [...activeData.value]
      .sort((a, b) => b.total_survival_time - a.total_survival_time)
      .map((item, i) => ({ ...item, rank: i + 1, timeFormatted: formatTime(item.total_survival_time) }))
  )

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${String(h).padStart(2,'0')}시간 ${String(m).padStart(2,'0')}분`
  }

  async function fetchAll(seasonId) {
    loading.value = true
    let q = supabase.from('match_data').select('*')
    if (seasonId) q = q.eq('season_id', seasonId)
    const [{ data: md }, { data: mb }] = await Promise.all([
      q,
      supabase.from('members').select('*').order('joined_at', { ascending: false })
    ])
    matchData.value = md ?? []
    members.value = mb ?? []
    // 멤버 기준 합산
    memberData.value = aggregateByMember(matchData.value, members.value)
    useSample.value = memberData.value.length === 0
    loading.value = false
  }

  async function fetchMembers() {
    const { data } = await supabase.from('members').select('*').order('joined_at', { ascending: false })
    members.value = data ?? []
    return members.value
  }

  function isUpgradeReady(m) {
    if (m.status !== '신규') return false
    return (Date.now() - new Date(m.joined_at).getTime()) / 86400000 >= 30
  }

  function getLuckyDrawPool(minPoints) {
    return contributionRanking.value.filter(m => m.contribution_points >= minPoints)
  }

  async function searchByPubgName(pubgName) {
    const { data } = await supabase.from('members')
      .select('*, match_data(*)')
      .ilike('pubg_name', `%${pubgName}%`)
      .limit(10)
    return data ?? []
  }

  return {
    matchData, memberData, members, loading, useSample,
    contributionRanking, bestPlayerRanking, mostTimeRanking,
    fetchAll, fetchMembers, isUpgradeReady, getLuckyDrawPool,
    searchByPubgName, formatTime
  }
})

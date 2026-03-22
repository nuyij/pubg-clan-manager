import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useSeasonStore = defineStore('season', () => {
  const seasons = ref([])
  const activeSeason = ref(null)
  const selectedSeasonId = ref(null) // 사용자가 보는 시즌

  const selectedSeason = computed(() =>
    seasons.value.find(s => s.id === selectedSeasonId.value) ?? activeSeason.value
  )

  async function fetchSeasons() {
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .order('started_at', { ascending: false })
    seasons.value = data ?? []
    activeSeason.value = seasons.value.find(s => s.is_active) ?? null
    if (!selectedSeasonId.value && activeSeason.value) {
      selectedSeasonId.value = activeSeason.value.id
    }
  }

  // 관리자: 새 시즌 시작 (현재 시즌 종료 후 새 시즌 생성)
  async function startNewSeason(name) {
    // 현재 활성 시즌 종료
    if (activeSeason.value) {
      await supabase.from('seasons')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', activeSeason.value.id)
    }
    // 새 시즌 생성
    const { data, error } = await supabase.from('seasons')
      .insert({ name, started_at: new Date().toISOString(), is_active: true })
      .select().single()
    if (error) throw error
    await fetchSeasons()
    return data
  }

  // 관리자: 현재 시즌 강제 종료
  async function endCurrentSeason() {
    if (!activeSeason.value) throw new Error('활성 시즌이 없습니다')
    await supabase.from('seasons')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', activeSeason.value.id)
    await fetchSeasons()
  }

  function selectSeason(seasonId) {
    selectedSeasonId.value = seasonId
  }

  return { seasons, activeSeason, selectedSeasonId, selectedSeason, fetchSeasons, startNewSeason, endCurrentSeason, selectSeason }
})

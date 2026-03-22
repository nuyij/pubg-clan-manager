import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    kill_weight: 10, assist_weight: 5,
    rank_scores: { 1:30,2:25,3:20,4:15,5:12,6:9,7:6,8:4,9:2,10:1 },
    newbie_bonus: 1.5,
    lucky_draw_min_points: 50, lucky_draw_count: 3,
    last_synced_at: null, last_lucky_draw: null,
    clan_name: 'MY CLAN', clan_logo_url: null,
    auto_sync_enabled: false, auto_sync_hour: 4,
  })

  async function fetch() {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) settings.value = { ...settings.value, ...data }
  }

  async function save(updates) {
    const { data, error } = await supabase
      .from('settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 1).select().single()
    if (error) throw error
    settings.value = { ...settings.value, ...data }
    return data
  }

  function getRankScoresArray() {
    return Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1, score: settings.value.rank_scores?.[i + 1] ?? 0
    }))
  }

  return { settings, fetch, save, getRankScoresArray }
})

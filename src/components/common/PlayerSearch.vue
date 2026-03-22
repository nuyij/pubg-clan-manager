<template>
  <div class="relative">
    <div class="flex gap-2">
      <input
        v-model="query"
        type="text"
        placeholder="배그 ID로 검색..."
        class="input-field flex-1"
        @keyup.enter="search"
        @input="onInput"
      />
      <button @click="search" :disabled="!query.trim() || loading" class="btn-outline px-4">
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </button>
    </div>

    <!-- 검색 결과 드롭다운 -->
    <div v-if="results.length" class="absolute top-full left-0 right-0 mt-1 card border border-clan-border z-30 overflow-hidden shadow-card">
      <div
        v-for="r in results" :key="r.id"
        class="px-4 py-3 hover:bg-clan-surface cursor-pointer border-b border-clan-border/50 last:border-0 flex items-center gap-3"
        @click="selectResult(r)"
      >
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold text-clan-text">{{ r.clan_nickname || '닉네임 미설정' }}</div>
          <div class="text-xs text-clan-muted font-mono">배그 ID: {{ r.pubg_name }}</div>
        </div>
        <span :class="['text-xs px-2 py-0.5 rounded font-mono', statusClass(r.status)]">{{ r.status }}</span>
      </div>
      <div class="px-4 py-2 text-xs text-clan-muted text-right">{{ results.length }}명 검색됨</div>
    </div>
    <div v-else-if="searched && !loading" class="absolute top-full left-0 right-0 mt-1 card px-4 py-3 text-sm text-clan-muted z-30">
      검색 결과가 없습니다
    </div>
  </div>

  <!-- 선택된 유저 상세 -->
  <div v-if="selected" class="mt-4 card p-5 animate-slide-up space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <div class="font-display text-lg font-bold text-clan-text">{{ selected.clan_nickname || '닉네임 미설정' }}</div>
        <div class="text-xs text-clan-muted font-mono">배그 ID: {{ selected.pubg_name }}</div>
      </div>
      <div class="flex items-center gap-2">
        <span :class="['text-xs px-2 py-1 rounded font-mono', statusClass(selected.status)]">{{ selected.status }}</span>
        <button @click="selected = null" class="text-clan-muted hover:text-clan-text text-xs">✕</button>
      </div>
    </div>

    <!-- 통계 -->
    <div v-if="selected.match_data?.length" class="grid grid-cols-3 gap-3">
      <div v-for="stat in statCards" :key="stat.label" class="bg-clan-surface rounded p-3 text-center">
        <div class="font-mono font-bold" :class="stat.color">{{ stat.value }}</div>
        <div class="text-xs text-clan-muted mt-0.5">{{ stat.label }}</div>
      </div>
    </div>
    <div v-else class="text-xs text-clan-muted text-center py-2">아직 기록된 전적이 없습니다</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRankingStore } from '@/stores/ranking'

const ranking = useRankingStore()
const query = ref('')
const results = ref([])
const selected = ref(null)
const loading = ref(false)
const searched = ref(false)
let debounceTimer = null

function onInput() {
  clearTimeout(debounceTimer)
  if (!query.value.trim()) { results.value = []; searched.value = false; return }
  debounceTimer = setTimeout(search, 400)
}

async function search() {
  if (!query.value.trim()) return
  loading.value = true; searched.value = false
  results.value = await ranking.searchByPubgName(query.value.trim())
  searched.value = true; loading.value = false
}

function selectResult(r) {
  selected.value = r
  results.value = []
  query.value = ''
  searched.value = false
}

const statCards = computed(() => {
  const d = selected.value?.match_data?.[0]
  if (!d) return []
  return [
    { label: '기여도', value: d.contribution_points + '점', color: 'text-clan-gold' },
    { label: '킬/어시', value: `${d.total_kills}/${d.total_assists}`, color: 'text-red-400' },
    { label: '생존시간', value: ranking.formatTime(d.total_survival_time), color: 'text-blue-400' },
    { label: '총 게임', value: d.total_games + '판', color: 'text-clan-text-dim' },
    { label: '베스트', value: Math.floor(d.best_player_points) + '점', color: 'text-green-400' },
    { label: '총 딜', value: Math.floor(d.total_damage).toLocaleString(), color: 'text-orange-400' },
  ]
})

function statusClass(s) {
  if (s === '신규') return 'bg-blue-900/40 text-blue-400 border border-blue-700/30'
  if (s === '텟생') return 'bg-purple-900/40 text-purple-400 border border-purple-700/30'
  return 'bg-green-900/40 text-green-400 border border-green-700/30'
}
</script>

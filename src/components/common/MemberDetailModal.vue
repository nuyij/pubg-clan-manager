<template>
    <div class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4"
      @click.self="$emit('close')">
      <div class="card max-w-2xl w-full animate-slide-up shadow-gold flex flex-col max-h-[90vh]">

        <!-- 헤더 -->
        <div class="p-5 border-b border-clan-border flex items-start justify-between gap-4 shrink-0">
          <div>
            <div class="font-display text-xl font-bold text-clan-text">
              {{ member.clan_nickname || member.pubg_name || '닉네임 미설정' }}
            </div>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <span v-for="acc in pubgAccounts" :key="acc.pubg_name"
                :class="['text-xs px-2 py-0.5 rounded font-mono',
                  acc.is_primary ? 'bg-clan-gold/20 text-clan-gold border border-clan-gold/30'
                                 : 'bg-clan-surface text-clan-muted border border-clan-border']">
                {{ acc.pubg_name }}{{ acc.is_primary ? ' ★' : '' }}
              </span>
              <span :class="['text-xs px-2 py-0.5 rounded font-mono', statusClass(member.status)]">
                {{ member.status }}
              </span>
            </div>
          </div>
          <button @click="$emit('close')" class="text-clan-muted hover:text-clan-text shrink-0 text-xl leading-none">✕</button>
        </div>

        <!-- 탭 -->
        <div class="flex border-b border-clan-border shrink-0 overflow-x-auto">
          <button v-for="t in tabs" :key="t.key"
            :class="['px-4 py-2 text-xs font-display tracking-widest border-b-2 transition-colors whitespace-nowrap',
              activeTab === t.key ? 'border-clan-gold text-clan-gold' : 'border-transparent text-clan-muted hover:text-clan-text']"
            @click="activeTab = t.key">
            {{ t.label }}
          </button>
        </div>

        <!-- 전체 통계 요약 (match_data 기반) -->
        <div v-if="totalStats" class="grid grid-cols-3 sm:grid-cols-6 gap-2 p-4 border-b border-clan-border shrink-0">
          <div v-for="stat in totalStats" :key="stat.label" class="bg-clan-surface rounded p-2 text-center">
            <div class="font-mono font-bold text-sm" :class="stat.color">{{ stat.value }}</div>
            <div class="text-[10px] text-clan-muted mt-0.5">{{ stat.label }}</div>
          </div>
        </div>

        <!-- 게임 목록 -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="loadingRecords" class="flex justify-center py-10">
            <div class="w-6 h-6 border-2 border-clan-gold border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else-if="!filteredRecords.length" class="text-center py-10 text-clan-muted text-sm">
            {{ activeTab === 'contribution' ? '기여도가 있는 게임이 없습니다 (파티 게임만 해당)' : '기록된 게임이 없습니다' }}
          </div>
          <div v-else>
            <!-- 컬럼 헤더 -->
            <div class="px-4 py-2 border-b border-clan-border bg-clan-surface/50 grid gap-2 text-[10px] text-clan-muted font-display tracking-widest"
              :class="colClass">
              <div>날짜</div>
              <div class="text-center">순위</div>
              <div class="text-center">킬</div>
              <div class="text-center">어시</div>
              <div class="text-right">딜량</div>
              <div class="text-right">생존</div>
              <div v-if="activeTab==='contribution'" class="text-right">기여도</div>
              <div v-else-if="activeTab==='bestplayer'" class="text-right">베플점수</div>
              <div v-else class="text-right">생존(분)</div>
            </div>

            <template v-for="rec in filteredRecords" :key="rec.id">
              <!-- 매치 행 -->
              <div class="px-4 py-2.5 border-b border-clan-border/40 hover:bg-clan-surface/40 cursor-pointer transition-colors grid gap-2 items-center text-xs"
                :class="[colClass, selectedRecord?.id === rec.id ? 'bg-clan-surface/60 border-l-2 border-l-clan-gold' : '']"
                @click="toggleRecord(rec)">
                <div>
                  <div class="font-mono text-clan-text-dim">{{ formatDate(rec.played_at) }}</div>
                  <div class="text-[10px] text-clan-muted">
                    {{ rec.is_party ? `파티 ${rec.party_size}인` : '솔로' }}
                    <span v-if="rec.pubg_name !== member.pubg_name" class="text-clan-gold ml-1">· {{ rec.pubg_name }}</span>
                  </div>
                </div>
                <div class="text-center">
                  <span :class="['font-mono font-bold', rec.win_place === 1 ? 'text-yellow-400' : 'text-clan-text-dim']">
                    {{ rec.win_place === 1 ? '🐔' : `#${rec.win_place}` }}
                  </span>
                </div>
                <div class="text-center font-mono text-red-400">{{ rec.kills }}</div>
                <div class="text-center font-mono text-blue-400">{{ rec.assists }}</div>
                <div class="text-right font-mono text-orange-300">{{ Math.floor(rec.damage).toLocaleString() }}</div>
                <div class="text-right font-mono text-clan-muted">{{ formatTime(rec.survival_time) }}</div>
                <div v-if="activeTab==='contribution'" class="text-right font-mono text-clan-gold">
                  {{ rec.contribution > 0 ? rec.contribution + '점' : '-' }}
                </div>
                <div v-else-if="activeTab==='bestplayer'" class="text-right font-mono text-green-400">
                  {{ Math.floor(rec.best_player_pts) }}
                </div>
                <div v-else class="text-right font-mono text-clan-gold">
                  {{ Math.floor(rec.survival_time / 60) }}분
                </div>
              </div>

              <!-- 인라인 상세 -->
              <div v-if="selectedRecord?.id === rec.id"
                class="border-b border-clan-border/40 bg-clan-surface/80 px-4 py-3 animate-slide-up">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  <div v-for="d in recordDetail(rec)" :key="d.label" class="bg-clan-card rounded p-2 text-center">
                    <div class="font-mono font-bold text-sm" :class="d.color">{{ d.value }}</div>
                    <div class="text-[10px] text-clan-muted">{{ d.label }}</div>
                  </div>
                </div>
                <!-- 파티원 -->
                <div v-if="rec.party_members?.length" class="mt-2">
                  <div class="text-[10px] text-clan-muted font-mono mb-1">파티원</div>
                  <div class="flex gap-1 flex-wrap">
                    <span v-for="pm in rec.party_members" :key="pm"
                      class="text-[10px] px-2 py-0.5 bg-clan-card border border-clan-border rounded font-mono text-clan-text-dim">
                      {{ pm }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 더보기 -->
        <div v-if="hasMore && !loadingRecords" class="p-3 border-t border-clan-border shrink-0 text-center">
          <button @click="loadMore" :disabled="loadingMore" class="btn-outline text-xs px-6">
            {{ loadingMore ? '불러오는 중...' : `더보기 (${records.length}/${totalCount}건 로드됨)` }}
          </button>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  member: Object,
  rankType: { type: String, default: 'contribution' }
})
defineEmits(['close'])

const records = ref([])
const loadingRecords = ref(false)
const loadingMore = ref(false)
const selectedRecord = ref(null)
const page = ref(0)
const PAGE_SIZE = 20
const hasMore = ref(false)
const totalCount = ref(0)
const activeTab = ref(props.rankType)
const matchData = ref(null)

const tabs = [
  { key: 'contribution', label: '🤝 기여도' },
  { key: 'bestplayer',   label: '🔫 베스트' },
  { key: 'mosttime',     label: '⏱️ 최장' },
  { key: 'all',          label: '전체' },
]

const colClass = 'grid-cols-[1fr_3rem_3rem_4rem_5rem_4rem_5rem]'

watch(activeTab, () => { selectedRecord.value = null })

// 탭별 필터링
// - 기여도: 파티 게임 + 기여도 > 0 만 표시 (기여도는 파티일 때만 발생)
// - 베스트/최장/전체: 필터 없이 모든 게임 표시
const filteredRecords = computed(() => {
  if (activeTab.value === 'contribution') return records.value.filter(r => r.is_party && r.contribution > 0)
  return records.value
})

const pubgAccounts = computed(() =>
  props.member.member_pubg_accounts ?? props.member.pubg_accounts ?? []
)

// 전체 통계: match_data에서 member_id 기준 여러 행 합산 (다중 계정 대응)
const totalStats = computed(() => {
  if (!matchData.value) return null
  const d = matchData.value
  const g = d.total_games || 1

  if (activeTab.value === 'contribution') return [
    { label: '기여도 합', value: d.contribution_points + '점', color: 'text-clan-gold' },
    { label: '총 게임', value: g + '판', color: 'text-clan-text' },
    { label: '평균 기여도', value: Math.floor(d.contribution_points / g) + '점', color: 'text-yellow-400' },
    { label: '킬/어시', value: `${d.total_kills}/${d.total_assists}`, color: 'text-red-400' },
    { label: '평균딜', value: Math.floor(d.total_damage / g).toLocaleString(), color: 'text-orange-300' },
    { label: '치킨', value: d.total_wins + '회', color: 'text-yellow-400' },
  ]
  if (activeTab.value === 'bestplayer') return [
    { label: '베플점수', value: Math.floor(d.best_player_points) + '점', color: 'text-clan-gold' },
    { label: '총 게임', value: g + '판', color: 'text-clan-text' },
    { label: '평균K/D', value: (d.total_kills / g).toFixed(2), color: 'text-orange-300' },
    { label: '킬/어시', value: `${d.total_kills}/${d.total_assists}`, color: 'text-red-400' },
    { label: '평균딜', value: Math.floor(d.total_damage / g).toLocaleString(), color: 'text-green-400' },
    { label: '치킨', value: d.total_wins + '회', color: 'text-yellow-400' },
  ]
  if (activeTab.value === 'mosttime') {
    const h = Math.floor(d.total_survival_time / 3600)
    const m = Math.floor((d.total_survival_time % 3600) / 60)
    return [
      { label: '총 생존', value: `${h}시간 ${m}분`, color: 'text-clan-gold' },
      { label: '총 게임', value: g + '판', color: 'text-clan-text' },
      { label: '평균 생존', value: Math.floor(d.total_survival_time / g / 60) + '분', color: 'text-blue-400' },
      { label: '킬/어시', value: `${d.total_kills}/${d.total_assists}`, color: 'text-red-400' },
      { label: '평균딜', value: Math.floor(d.total_damage / g).toLocaleString(), color: 'text-orange-300' },
      { label: '치킨', value: d.total_wins + '회', color: 'text-yellow-400' },
    ]
  }
  return [
    { label: '총 게임', value: g + '판', color: 'text-clan-text' },
    { label: '기여도 합', value: d.contribution_points + '점', color: 'text-clan-gold' },
    { label: '평균K/D', value: (d.total_kills / g).toFixed(2), color: 'text-orange-300' },
    { label: '킬/어시', value: `${d.total_kills}/${d.total_assists}`, color: 'text-red-400' },
    { label: '평균딜', value: Math.floor(d.total_damage / g).toLocaleString(), color: 'text-green-400' },
    { label: '치킨', value: d.total_wins + '회', color: 'text-yellow-400' },
  ]
})

watch(() => props.member?.id, (newId) => {
  if (!newId) return
  page.value = 0
  records.value = []
  selectedRecord.value = null
  matchData.value = null
  activeTab.value = props.rankType
  loadAll()
}, { immediate: true })

async function loadAll() {
  if (!props.member?.id) return
  loadingRecords.value = true

  const [mdResult, countResult, recordsResult] = await Promise.all([
    // ✅ maybeSingle() 제거 → 여러 행 반환 (다중 계정 합산용)
    supabase.from('match_data').select('*').eq('member_id', props.member.id),
    supabase.from('match_records').select('*', { count: 'exact', head: true }).eq('member_id', props.member.id),
    supabase.from('match_records').select('*').eq('member_id', props.member.id)
      .order('played_at', { ascending: false }).range(0, PAGE_SIZE - 1),
  ])

  // 다중 계정: member_id 기준 여러 행 합산
  const mdRows = mdResult.data ?? []
  if (mdRows.length === 0) {
    matchData.value = null
  } else if (mdRows.length === 1) {
    matchData.value = mdRows[0]
  } else {
    matchData.value = mdRows.reduce((acc, row) => ({
      ...acc,
      total_kills:         (acc.total_kills ?? 0) + (row.total_kills ?? 0),
      total_assists:       (acc.total_assists ?? 0) + (row.total_assists ?? 0),
      total_damage:        (acc.total_damage ?? 0) + (row.total_damage ?? 0),
      total_survival_time: (acc.total_survival_time ?? 0) + (row.total_survival_time ?? 0),
      total_wins:          (acc.total_wins ?? 0) + (row.total_wins ?? 0),
      total_games:         (acc.total_games ?? 0) + (row.total_games ?? 0),
      contribution_points: (acc.contribution_points ?? 0) + (row.contribution_points ?? 0),
      best_player_points:  (acc.best_player_points ?? 0) + (row.best_player_points ?? 0),
    }))
  }

  totalCount.value = countResult.count ?? 0
  records.value = recordsResult.data ?? []
  hasMore.value = records.value.length < totalCount.value
  loadingRecords.value = false
}

async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  page.value++
  const from = page.value * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data } = await supabase.from('match_records').select('*')
    .eq('member_id', props.member.id)
    .order('played_at', { ascending: false })
    .range(from, to)
  const rows = data ?? []
  records.value = [...records.value, ...rows]
  hasMore.value = records.value.length < totalCount.value
  loadingMore.value = false
}

function toggleRecord(rec) {
  selectedRecord.value = selectedRecord.value?.id === rec.id ? null : rec
}

function recordDetail(rec) {
  return [
    { label: '순위', value: rec.win_place === 1 ? '🐔 치킨' : `#${rec.win_place} / ${rec.total_players}명`, color: rec.win_place === 1 ? 'text-yellow-400' : 'text-clan-text' },
    { label: '킬 / 어시', value: `${rec.kills} / ${rec.assists}`, color: 'text-red-400' },
    { label: '딜량', value: Math.floor(rec.damage).toLocaleString(), color: 'text-orange-300' },
    { label: '생존시간', value: formatTime(rec.survival_time), color: 'text-blue-400' },
    { label: '기여도', value: rec.contribution > 0 ? rec.contribution + '점' : '솔로(0점)', color: 'text-clan-gold' },
    { label: '베플점수', value: Math.floor(rec.best_player_pts), color: 'text-green-400' },
    { label: '파티', value: rec.is_party ? `${rec.party_size}인 파티` : '솔로', color: 'text-clan-text-dim' },
    { label: '배그 ID', value: rec.pubg_name, color: 'text-clan-muted' },
  ]
}

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatTime(seconds) {
  if (!seconds) return '0분'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}
const statusClass = (s) =>
  s === '신규' ? 'bg-blue-900/40 text-blue-400 border border-blue-700/30' :
  s === '텟생' ? 'bg-purple-900/40 text-purple-400 border border-purple-700/30' :
  'bg-green-900/40 text-green-400 border border-green-700/30'
</script>
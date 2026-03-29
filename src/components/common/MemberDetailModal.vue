<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="card max-w-2xl w-full animate-slide-up shadow-gold flex flex-col max-h-[90vh]">

        <!-- 헤더 -->
        <div class="p-5 border-b border-clan-border flex items-start justify-between gap-4 shrink-0">
          <div>
            <div class="font-display text-xl font-bold text-clan-text">
              {{ member.clan_nickname || member.pubg_name || '닉네임 미설정' }}
            </div>
            <div class="flex items-center gap-2 mt-1 flex-wrap">
              <span v-for="acc in pubgAccounts" :key="acc.pubg_name"
                :class="['text-xs px-2 py-0.5 rounded font-mono', acc.is_primary ? 'bg-clan-gold/20 text-clan-gold border border-clan-gold/30' : 'bg-clan-surface text-clan-muted border border-clan-border']">
                {{ acc.pubg_name }}{{ acc.is_primary ? ' ★' : '' }}
              </span>
              <span :class="['text-xs px-2 py-0.5 rounded font-mono', statusClass(member.status)]">{{ member.status }}</span>
            </div>
          </div>
          <button @click="$emit('close')" class="text-clan-muted hover:text-clan-text shrink-0">✕</button>
        </div>

        <!-- 통계 요약 -->
        <div v-if="summary" class="grid grid-cols-3 sm:grid-cols-6 gap-2 p-4 border-b border-clan-border shrink-0">
          <div v-for="stat in summaryStats" :key="stat.label" class="bg-clan-surface rounded p-2 text-center">
            <div class="font-mono font-bold text-sm" :class="stat.color">{{ stat.value }}</div>
            <div class="text-[10px] text-clan-muted mt-0.5">{{ stat.label }}</div>
          </div>
        </div>

        <!-- 게임 목록 -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="loadingRecords" class="flex justify-center py-10">
            <div class="w-6 h-6 border-2 border-clan-gold border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else-if="!records.length" class="text-center py-10 text-clan-muted text-sm">
            기록된 게임이 없습니다
          </div>
          <div v-else>
            <div class="px-4 py-2 border-b border-clan-border bg-clan-surface/50 grid grid-cols-[1fr_3rem_3rem_4rem_4rem_4rem_5rem] gap-2 text-[10px] text-clan-muted font-display tracking-widest">
              <div>날짜</div>
              <div class="text-center">순위</div>
              <div class="text-center">킬</div>
              <div class="text-center">어시</div>
              <div class="text-right">딜량</div>
              <div class="text-right">생존</div>
              <div class="text-right">기여도</div>
            </div>
            <div v-for="rec in records" :key="rec.id"
              class="px-4 py-2.5 border-b border-clan-border/40 last:border-0 hover:bg-clan-surface/40 cursor-pointer transition-colors grid grid-cols-[1fr_3rem_3rem_4rem_4rem_4rem_5rem] gap-2 items-center text-xs"
              @click="selectedRecord = selectedRecord?.id === rec.id ? null : rec">
              <div>
                <div class="font-mono text-clan-text-dim">{{ formatDate(rec.played_at) }}</div>
                <div class="text-[10px] text-clan-muted">
                  {{ rec.is_party ? `파티 ${rec.party_size}인` : '솔로' }} · {{ rec.pubg_name }}
                </div>
              </div>
              <div class="text-center">
                <span :class="['font-mono font-bold text-xs', rec.win_place === 1 ? 'text-yellow-400' : 'text-clan-text-dim']">
                  {{ rec.win_place === 1 ? '🐔' : `#${rec.win_place}` }}
                </span>
              </div>
              <div class="text-center font-mono text-red-400">{{ rec.kills }}</div>
              <div class="text-center font-mono text-blue-400">{{ rec.assists }}</div>
              <div class="text-right font-mono text-orange-300">{{ Math.floor(rec.damage).toLocaleString() }}</div>
              <div class="text-right font-mono text-clan-muted">{{ formatTime(rec.survival_time) }}</div>
              <div class="text-right font-mono text-clan-gold">{{ rec.contribution > 0 ? rec.contribution + '점' : '-' }}</div>
            </div>

            <!-- 선택된 게임 상세 -->
            <div v-if="selectedRecord" class="mx-4 mb-4 mt-2 bg-clan-surface rounded-lg p-4 border border-clan-gold/30 animate-slide-up">
              <div class="text-xs text-clan-gold font-mono font-bold mb-3">📊 게임 상세</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div v-for="d in recordDetail(selectedRecord)" :key="d.label" class="text-center">
                  <div class="font-mono font-bold" :class="d.color">{{ d.value }}</div>
                  <div class="text-[10px] text-clan-muted">{{ d.label }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 더보기 -->
        <div v-if="hasMore" class="p-3 border-t border-clan-border shrink-0 text-center">
          <button @click="loadMore" :disabled="loadingMore" class="btn-outline text-xs px-6">
            {{ loadingMore ? '불러오는 중...' : '더보기' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({ member: Object })
defineEmits(['close'])

const records = ref([])
const loadingRecords = ref(false)
const loadingMore = ref(false)
const selectedRecord = ref(null)
const page = ref(0)
const PAGE_SIZE = 20
const hasMore = ref(false)

const pubgAccounts = computed(() =>
  props.member.member_pubg_accounts ?? props.member.pubg_accounts ?? []
)

// 전체 통계 요약 (match_records 기반)
const summary = computed(() => {
  if (!records.value.length) return null
  return records.value.reduce((acc, r) => ({
    total_kills: acc.total_kills + r.kills,
    total_assists: acc.total_assists + r.assists,
    total_damage: acc.total_damage + r.damage,
    total_survival_time: acc.total_survival_time + r.survival_time,
    total_games: acc.total_games + 1,
    total_wins: acc.total_wins + (r.win_place === 1 ? 1 : 0),
    contribution: acc.contribution + r.contribution,
  }), { total_kills: 0, total_assists: 0, total_damage: 0, total_survival_time: 0, total_games: 0, total_wins: 0, contribution: 0 })
})

const summaryStats = computed(() => {
  if (!summary.value) return []
  const s = summary.value
  const g = s.total_games || 1
  return [
    { label: '총 게임', value: s.total_games + '판', color: 'text-clan-text' },
    { label: '기여도 합', value: s.contribution + '점', color: 'text-clan-gold' },
    { label: '킬/어시', value: `${s.total_kills}/${s.total_assists}`, color: 'text-red-400' },
    { label: '평균K/D', value: (s.total_kills / g).toFixed(2), color: 'text-orange-300' },
    { label: '평균딜', value: Math.floor(s.total_damage / g).toLocaleString(), color: 'text-green-400' },
    { label: '치킨', value: s.total_wins + '회', color: 'text-yellow-400' },
  ]
})

async function loadRecords(append = false) {
  if (!props.member?.id) return
  if (append) loadingMore.value = true
  else loadingRecords.value = true

  const from = page.value * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data } = await supabase
    .from('match_records')
    .select('*')
    .eq('member_id', props.member.id)
    .order('played_at', { ascending: false })
    .range(from, to)

  const rows = data ?? []
  if (append) records.value.push(...rows)
  else records.value = rows
  hasMore.value = rows.length === PAGE_SIZE

  loadingRecords.value = false
  loadingMore.value = false
}

async function loadMore() {
  page.value++
  await loadRecords(true)
}

onMounted(() => loadRecords())

function recordDetail(rec) {
  return [
    { label: '순위', value: rec.win_place === 1 ? '🐔 치킨' : `#${rec.win_place} / ${rec.total_players}명`, color: rec.win_place === 1 ? 'text-yellow-400' : 'text-clan-text' },
    { label: '킬', value: rec.kills, color: 'text-red-400' },
    { label: '어시스트', value: rec.assists, color: 'text-blue-400' },
    { label: '딜량', value: Math.floor(rec.damage).toLocaleString(), color: 'text-orange-300' },
    { label: '생존시간', value: formatTime(rec.survival_time), color: 'text-clan-muted' },
    { label: '기여도', value: rec.contribution > 0 ? rec.contribution + '점' : '0 (솔로)', color: 'text-clan-gold' },
    { label: '파티', value: rec.is_party ? `${rec.party_size}인 파티` : '솔로', color: 'text-clan-text-dim' },
    { label: '베플점수', value: Math.floor(rec.best_player_pts), color: 'text-green-400' },
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

<template>
  <div class="card p-6 space-y-5">
    <div class="section-title">🔄 데이터 동기화</div>

    <!-- 상태 카드 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-clan-surface rounded p-3 text-center">
        <div class="font-mono text-xl font-bold text-clan-gold">{{ totalMembers }}</div>
        <div class="text-xs text-clan-muted mt-1">총 클랜원</div>
      </div>
      <div class="bg-clan-surface rounded p-3 text-center">
        <div class="font-mono text-xl font-bold text-clan-text">{{ processedMatches }}</div>
        <div class="text-xs text-clan-muted mt-1">처리된 매치</div>
      </div>
      <div class="bg-clan-surface rounded p-3 text-center">
        <div class="font-mono text-xs font-bold text-clan-text-dim leading-tight">{{ lastSynced }}</div>
        <div class="text-xs text-clan-muted mt-1">최종 갱신</div>
      </div>
      <div class="bg-clan-surface rounded p-3 text-center cursor-pointer hover:border-clan-gold border border-transparent transition-colors"
        @click="testApiConnection">
        <div class="font-mono text-sm font-bold" :class="apiStatus.color">{{ apiStatus.label }}</div>
        <div class="text-xs text-clan-muted mt-1">API 상태 (클릭=테스트)</div>
      </div>
    </div>

    <!-- Edge Function 안내 -->
    <div v-if="showEdgeFunctionGuide" class="bg-red-900/20 border border-red-700/40 rounded-lg p-4 space-y-3">
      <div class="text-red-400 font-bold text-sm">⚠️ Edge Function이 배포되지 않았습니다</div>
      <div class="bg-clan-bg rounded p-3 font-mono text-xs text-green-400 space-y-1">
        <div>supabase secrets set PUBG_API_KEY=<span class="text-yellow-400">키값</span></div>
        <div>supabase functions deploy pubg-proxy --project-ref <span class="text-yellow-400">프로젝트ID</span></div>
      </div>
    </div>

    <!-- 오류 표시 -->
    <div v-if="lastError" class="bg-red-900/20 border border-red-700/30 rounded p-3">
      <div class="text-red-400 text-xs font-mono font-bold mb-1">오류</div>
      <div class="text-red-300 text-xs font-mono whitespace-pre-wrap">{{ lastError }}</div>
    </div>

    <!-- 진행 상태 -->
    <div v-if="syncing" class="space-y-2">
      <div class="flex justify-between text-xs font-mono text-clan-muted">
        <span>{{ progressMsg }}</span>
        <div class="flex items-center gap-3">
          <span v-if="estimatedSec > 0" class="text-clan-gold">
            예상 잔여 {{ formatRemaining(estimatedSec) }}
          </span>
          <span>{{ progressPct }}%</span>
        </div>
      </div>
      <div class="h-2 bg-clan-surface rounded overflow-hidden">
        <div class="h-full bg-clan-gold transition-all duration-500 rounded" :style="{ width: progressPct + '%' }" />
      </div>
      <!-- 타임아웃 경고 -->
      <div v-if="elapsedSec > 120" class="text-yellow-400 text-xs font-mono flex items-center gap-2">
        ⚠️ {{ formatElapsed(elapsedSec) }} 경과 중...
        <button @click="forceStop" class="underline text-red-400">강제 중단</button>
      </div>
    </div>

    <!-- 경고 로그 -->
    <div v-if="errors.length" class="bg-yellow-900/20 border border-yellow-700/30 rounded p-3 max-h-32 overflow-y-auto">
      <div class="text-yellow-400 text-xs font-mono font-bold mb-2">처리 중 경고 ({{ errors.length }}건)</div>
      <div v-for="(e, i) in errors" :key="i" class="text-yellow-300 text-xs font-mono">{{ e }}</div>
    </div>

    <!-- 완료 -->
    <div v-if="syncResult" class="bg-green-900/20 border border-green-700/30 rounded p-3 text-sm text-green-400 font-mono">
      ✅ 갱신 완료 — {{ syncResult.processed }}개 매치 / {{ syncResult.saved }}건 저장 / {{ syncResult.errCount }}건 경고
      <span v-if="syncResult.message" class="text-clan-muted ml-2 text-xs">{{ syncResult.message }}</span>
      <div class="text-clan-muted text-xs mt-1">소요시간: {{ syncResult.elapsed }}</div>
    </div>

    <!-- 자동 갱신 -->
    <div class="bg-clan-surface rounded-lg p-4 border border-clan-border space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm font-mono text-clan-muted">자동 갱신 (매일)</span>
        <button @click="toggleAutoSync"
          :class="['relative w-12 h-6 rounded-full transition-colors', settingsStore.settings.auto_sync_enabled ? 'bg-clan-gold' : 'bg-clan-border']">
          <div :class="['absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
            settingsStore.settings.auto_sync_enabled ? 'translate-x-7' : 'translate-x-1']" />
        </button>
      </div>
      <div v-if="settingsStore.settings.auto_sync_enabled" class="flex items-center gap-3">
        <span class="text-xs text-clan-muted font-mono">갱신 시각</span>
        <select v-model.number="autoSyncHour" @change="saveAutoSync" class="input-field w-24 text-xs">
          <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2,'0') }}:00</option>
        </select>
        <span class="text-xs text-clan-muted">KST 기준 (pg_cron UTC 변환 필요)</span>
      </div>
    </div>

    <!-- 갱신 버튼 -->
    <button @click="confirmSync" :disabled="syncing" class="w-full btn-gold flex items-center justify-center gap-2 py-3">
      <svg class="w-5 h-5" :class="syncing ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      {{ syncing ? (progressMsg || '갱신 중...') : '🔄 배그 API 데이터 강제 갱신' }}
    </button>

    <!-- 확인 모달 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div class="card p-6 max-w-sm w-full animate-slide-up shadow-gold space-y-4">
          <div class="text-center">
            <div class="text-4xl mb-3">🔄</div>
            <h3 class="font-display font-bold text-lg">데이터 갱신 확인</h3>
            <p class="text-sm text-clan-muted mt-2">
              현재 활성 시즌의 신규 매치를 가져옵니다.<br>
              <span class="text-clan-gold">예상 소요: {{ estimateTime }}</span>
            </p>
          </div>
          <div class="flex gap-3">
            <button @click="showConfirm = false" class="flex-1 btn-outline">취소</button>
            <button @click="startSync" class="flex-1 btn-gold">갱신 시작</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { useSettingsStore } from '@/stores/settings'
import { useSeasonStore } from '@/stores/season'
import { supabase } from '@/lib/supabase'
import { syncAllMatches } from '@/lib/pubgApi'

const rankingStore = useRankingStore()
const settingsStore = useSettingsStore()
const seasonStore = useSeasonStore()

const syncing = ref(false)
const showConfirm = ref(false)
const progressMsg = ref('')
const progressPct = ref(0)
const errors = ref([])
const syncResult = ref(null)
const lastError = ref('')
const showEdgeFunctionGuide = ref(false)
const totalMembers = ref(0)
const processedMatches = ref(0)
const autoSyncHour = ref(4)
const apiStatus = ref({ label: '미확인', color: 'text-clan-muted' })

// 타이머
const elapsedSec = ref(0)
const estimatedSec = ref(0)
let timerInterval = null
let syncAborted = false

const lastSynced = computed(() => {
  const ts = settingsStore.settings.last_synced_at
  if (!ts) return '없음'
  return new Date(ts).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
})

// 예상 소요시간 (멤버수 × 매치수 기반)
const estimateTime = computed(() => {
  const members = totalMembers.value || 1
  // 플레이어조회 + 매치목록 + 매치상세(최대20개) × 딜레이
  const secs = Math.ceil(members * 2 + members * 20 * 0.4)
  if (secs < 60) return `약 ${secs}초`
  return `약 ${Math.ceil(secs / 60)}분`
})

function formatRemaining(sec) {
  if (sec < 60) return `${sec}초`
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`
}
function formatElapsed(sec) {
  if (sec < 60) return `${sec}초`
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`
}

function startTimer() {
  elapsedSec.value = 0
  timerInterval = setInterval(() => {
    elapsedSec.value++
    // 예상 잔여시간 계산 (진행률 기반)
    if (progressPct.value > 5) {
      const totalEst = (elapsedSec.value / progressPct.value) * 100
      estimatedSec.value = Math.max(0, Math.ceil(totalEst - elapsedSec.value))
    }
    // 5분 타임아웃
    if (elapsedSec.value >= 300) {
      forceStop()
    }
  }, 1000)
}

function stopTimer() {
  clearInterval(timerInterval)
  timerInterval = null
  estimatedSec.value = 0
}

function forceStop() {
  syncAborted = true
  syncing.value = false
  stopTimer()
  lastError.value = `타임아웃: ${formatElapsed(elapsedSec.value)} 경과 후 강제 중단됨. 진행된 데이터는 저장되었을 수 있습니다.`
  progressMsg.value = ''
}

onUnmounted(() => stopTimer())

onMounted(async () => {
  const [{ count: mc }, { count: pc }] = await Promise.all([
    supabase.from('match_history').select('*', { count: 'exact', head: true }),
    supabase.from('members').select('*', { count: 'exact', head: true }),
  ])
  totalMembers.value = pc ?? 0
  processedMatches.value = mc ?? 0
  autoSyncHour.value = settingsStore.settings.auto_sync_hour ?? 4
})

async function testApiConnection() {
  apiStatus.value = { label: '테스트 중...', color: 'text-yellow-400' }
  showEdgeFunctionGuide.value = false; lastError.value = ''
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pubg-proxy?path=${encodeURIComponent('/players?filter[playerNames]=test')}`
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } })
    if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`)
    apiStatus.value = { label: '✓ 연결됨', color: 'text-green-400' }
  } catch (e) {
    apiStatus.value = { label: '✗ 오류', color: 'text-red-400' }
    lastError.value = e.message
    if (e.message.includes('fetch') || e.message.includes('Function')) showEdgeFunctionGuide.value = true
  }
}

function confirmSync() {
  syncResult.value = null; errors.value = []; lastError.value = ''
  showEdgeFunctionGuide.value = false; showConfirm.value = true
}

async function startSync() {
  showConfirm.value = false
  syncing.value = true
  syncAborted = false
  progressPct.value = 0
  progressMsg.value = '준비 중...'
  startTimer()
  const startTime = Date.now()

  try {
    const { data: history } = await supabase.from('match_history').select('match_id')
    const processedMatchIds = new Set((history ?? []).map(h => h.match_id))
    const members = await rankingStore.fetchMembers()
    await settingsStore.fetch()

    // 다중 배그 계정 로드
    const { data: allAccounts } = await supabase
      .from('member_pubg_accounts').select('member_id, pubg_name, is_primary')
    const accountMap = {}
    for (const acc of (allAccounts ?? [])) {
      if (!accountMap[acc.member_id]) accountMap[acc.member_id] = []
      accountMap[acc.member_id].push(acc)
    }
    const membersWithAccounts = members.map(m => ({
      ...m,
      pubg_accounts: accountMap[m.id] ?? (m.pubg_name ? [{ pubg_name: m.pubg_name, is_primary: true }] : [])
    }))

    const activeSeason = seasonStore.activeSeason
    const seasonRange = activeSeason
      ? { start: activeSeason.started_at, end: new Date().toISOString() }
      : null

    if (syncAborted) return

    const { results, records, errors: errs, processedCount, message } = await syncAllMatches({
      members: membersWithAccounts,
      settings: settingsStore.settings,
      processedMatchIds,
      seasonRange,
      onProgress: (msg) => {
        if (syncAborted) return
        progressMsg.value = msg
        progressPct.value = Math.min(progressPct.value + 5, 88)
      }
    })

    if (syncAborted) return

    // ── 점수 저장 ──────────────────────────────────────
    progressMsg.value = `점수 저장 중... (${results.length}건)`
    progressPct.value = 90

    // 1. JS에서 pubg_name별로 합산
    const aggregated = {}
    for (const r of results) {
      if (!aggregated[r.pubg_name]) {
        const member = membersWithAccounts.find(m =>
          m.pubg_accounts?.some(a => a.pubg_name === r.pubg_name) || m.pubg_name === r.pubg_name
        )
        aggregated[r.pubg_name] = {
          pubg_name: r.pubg_name,
          member_id: member?.id ?? null,
          season_id: activeSeason?.id ?? null,
          total_kills: 0, total_assists: 0, total_damage: 0,
          total_survival_time: 0, total_wins: 0, total_games: 0,
          contribution_points: 0, best_player_points: 0,
        }
      }
      const a = aggregated[r.pubg_name]
      a.total_kills         += r.kills
      a.total_assists       += r.assists
      a.total_damage        += r.damage
      a.total_survival_time += r.survivalTime
      a.total_wins          += r.winPlace === 1 ? 1 : 0
      a.total_games         += 1
      a.contribution_points += r.contributionPoints
      a.best_player_points  += r.bestPlayerPoints
    }

    // 2. match_data: Supabase RPC로 원자적 upsert
    const aggRows = Object.values(aggregated)
    for (const row of aggRows) {
      if (syncAborted) break
      const { error } = await supabase.rpc('upsert_match_data', {
        p_pubg_name:    row.pubg_name,
        p_member_id:    row.member_id,
        p_season_id:    row.season_id,
        p_kills:        row.total_kills,
        p_assists:      row.total_assists,
        p_damage:       row.total_damage,
        p_survival_time: row.total_survival_time,
        p_is_win:       row.total_wins,
        p_contribution: row.contribution_points,
        p_best_player:  row.best_player_points,
      })
      if (error) errs.push(`match_data 저장 실패(${row.pubg_name}): ${error.message}`)
    }

    // 3. match_records 배치 저장 (100건씩)
    if (records.length && !syncAborted) {
      progressMsg.value = `게임 기록 저장 중... (${records.length}건)`
      const recordsWithSeason = records.map(r => ({ ...r, season_id: activeSeason?.id ?? null }))
      for (let i = 0; i < recordsWithSeason.length; i += 100) {
        if (syncAborted) break
        const { error } = await supabase
          .from('match_records')
          .upsert(recordsWithSeason.slice(i, i + 100), { onConflict: 'match_id,pubg_name', ignoreDuplicates: true })
        if (error) errs.push(`게임기록 저장 실패: ${error.message}`)
      }
    }

    // 4. match_history 저장
    if (!syncAborted) {
      const newIds = [...processedMatchIds].filter(id => !(history ?? []).some(h => h.match_id === id))
      if (newIds.length) {
        await supabase.from('match_history').insert(
          newIds.map(id => ({ match_id: id, season_id: activeSeason?.id ?? null }))
        )
      }
      await settingsStore.save({ last_synced_at: new Date().toISOString() })
      await rankingStore.fetchAll(activeSeason?.id)
    }

    const elapsedMs = Date.now() - startTime
    const elapsedStr = elapsedMs < 60000
      ? `${Math.floor(elapsedMs / 1000)}초`
      : `${Math.floor(elapsedMs / 60000)}분 ${Math.floor((elapsedMs % 60000) / 1000)}초`

    errors.value = errs
    syncResult.value = {
      processed: processedCount,
      saved: aggRows.length,
      errCount: errs.length,
      message,
      elapsed: elapsedStr,
    }
    progressPct.value = 100
    processedMatches.value += processedCount

  } catch (e) {
    lastError.value = e.message
    errors.value = [e.message]
    if (e.message.includes('Edge Function') || e.message.includes('fetch') || e.message.includes('네트워크')) {
      showEdgeFunctionGuide.value = true
    }
  } finally {
    syncing.value = false
    stopTimer()
  }
}

async function toggleAutoSync() {
  await settingsStore.save({ auto_sync_enabled: !settingsStore.settings.auto_sync_enabled })
}
async function saveAutoSync() {
  await settingsStore.save({ auto_sync_hour: autoSyncHour.value })
}
</script>

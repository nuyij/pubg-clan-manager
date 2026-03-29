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
    <div v-if="showEdgeFunctionGuide" class="bg-red-900/20 border border-red-700/40 rounded-lg p-4 space-y-2">
      <div class="text-red-400 font-bold text-sm">⚠️ Edge Function이 배포되지 않았습니다</div>
      <div class="bg-clan-bg rounded p-3 font-mono text-xs text-green-400 space-y-1">
        <div>supabase secrets set PUBG_API_KEY=<span class="text-yellow-400">키값</span></div>
        <div>supabase functions deploy pubg-proxy --project-ref <span class="text-yellow-400">프로젝트ID</span></div>
      </div>
    </div>

    <!-- 오류 -->
    <div v-if="lastError" class="bg-red-900/20 border border-red-700/30 rounded p-3">
      <div class="text-red-400 text-xs font-mono font-bold mb-1">오류</div>
      <div class="text-red-300 text-xs font-mono whitespace-pre-wrap">{{ lastError }}</div>
    </div>

    <!-- 진행 상태 -->
    <div v-if="syncing" class="space-y-2">
      <div class="flex justify-between text-xs font-mono text-clan-muted">
        <span>{{ progressMsg }}</span>
        <div class="flex items-center gap-3">
          <span v-if="estimatedSec > 0" class="text-clan-gold">잔여 {{ formatSec(estimatedSec) }}</span>
          <span>{{ progressPct }}%</span>
        </div>
      </div>
      <div class="h-2 bg-clan-surface rounded overflow-hidden">
        <div class="h-full bg-clan-gold transition-all duration-500 rounded" :style="{ width: progressPct + '%' }" />
      </div>
      <div v-if="elapsedSec > 120" class="text-yellow-400 text-xs font-mono flex items-center gap-2">
        ⚠️ {{ formatSec(elapsedSec) }} 경과
        <button @click="forceStop" class="underline text-red-400 ml-2">강제 중단</button>
      </div>
    </div>

    <!-- 경고 로그 -->
    <div v-if="errors.length" class="bg-yellow-900/20 border border-yellow-700/30 rounded p-3 max-h-32 overflow-y-auto">
      <div class="text-yellow-400 text-xs font-mono font-bold mb-2">처리 중 경고 ({{ errors.length }}건)</div>
      <div v-for="(e, i) in errors" :key="i" class="text-yellow-300 text-xs font-mono">{{ e }}</div>
    </div>

    <!-- 완료 -->
    <div v-if="syncResult" class="bg-green-900/20 border border-green-700/30 rounded p-3 font-mono text-xs space-y-1">
      <div class="text-green-400">✅ 갱신 완료</div>
      <div class="text-clan-muted">처리: {{ syncResult.processed }}개 · 저장: {{ syncResult.saved }}건 · 경고: {{ syncResult.errCount }}건 · 소요: {{ syncResult.elapsed }}</div>
      <div v-if="syncResult.message" class="text-yellow-400">{{ syncResult.message }}</div>
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
        <span class="text-xs text-clan-muted">KST</span>
      </div>
    </div>

    <!-- 일반 갱신 버튼 -->
    <button @click="confirmSync" :disabled="syncing" class="w-full btn-gold flex items-center justify-center gap-2 py-3">
      <svg class="w-5 h-5" :class="syncing && !manualMode ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      {{ syncing && !manualMode ? (progressMsg || '갱신 중...') : '🔄 배그 API 데이터 강제 갱신' }}
    </button>

    <!-- ── 누락 매치 수동 입력 섹션 ────────────────── -->
    <div class="bg-clan-surface rounded-lg p-4 border border-clan-border space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-mono text-clan-gold font-bold">🔍 누락 매치 수동 처리</div>
          <div class="text-xs text-clan-muted mt-0.5">시즌 종료 후 집계되지 않은 매치를 직접 추가합니다</div>
        </div>
        <button @click="showManualSection = !showManualSection" class="text-clan-muted hover:text-clan-text text-xs">
          {{ showManualSection ? '접기 ▲' : '펼치기 ▼' }}
        </button>
      </div>

      <div v-if="showManualSection" class="space-y-3">
        <!-- 안내 -->
        <div class="bg-clan-card rounded p-3 border border-clan-border space-y-2 text-xs text-clan-muted leading-relaxed">
          <div class="text-clan-gold font-mono font-bold text-xs">📌 Match ID 확인 방법</div>
          <div>
            1. <a href="https://dak.gg/pubg" target="_blank" class="text-blue-400 underline">dak.gg/pubg</a> 또는
            <a href="https://pubg.op.gg" target="_blank" class="text-blue-400 underline">pubg.op.gg</a> 접속
          </div>
          <div>2. 클랜원 닉네임 검색 → 매치 목록 확인</div>
          <div>3. 원하는 매치 클릭 → 주소창 URL에서 마지막 ID 복사</div>
          <div class="font-mono bg-clan-bg rounded p-2 text-clan-text-dim break-all">
            예시: https://dak.gg/pubg/matches/<span class="text-yellow-400">kakao.match.2024.01.01T00_00_00Z.xxxx</span>
          </div>
          <div class="text-yellow-400">⚠️ 경쟁전 매치만 처리됩니다. 다른 모드는 자동으로 제외됩니다.</div>
        </div>

        <!-- 입력 -->
        <div class="flex gap-2">
          <input v-model="manualInput" type="text"
            placeholder="Match ID 입력 (예: kakao.match.2024...)"
            class="input-field flex-1 font-mono text-xs"
            @keyup.enter="addManualId" />
          <button @click="addManualId" :disabled="!manualInput.trim()" class="btn-outline px-4 whitespace-nowrap text-xs">
            추가
          </button>
        </div>

        <!-- 추가된 목록 -->
        <div v-if="manualIds.length" class="space-y-1.5">
          <div class="text-xs text-clan-muted font-mono">처리 예정 ({{ manualIds.length }}개)</div>
          <div v-for="(id, i) in manualIds" :key="id"
            class="flex items-center gap-2 bg-clan-card rounded px-3 py-1.5 border border-clan-border">
            <span class="font-mono text-xs text-clan-text-dim flex-1 truncate">{{ id }}</span>
            <button @click="manualIds.splice(i, 1)" class="text-red-400 hover:text-red-300 text-xs shrink-0">✕</button>
          </div>
          <button @click="startManualSync" :disabled="syncing || !manualIds.length"
            class="w-full btn-gold py-2 text-sm flex items-center justify-center gap-2 mt-2">
            <svg class="w-4 h-4" :class="syncing && manualMode ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            {{ syncing && manualMode ? (progressMsg || '처리 중...') : `${manualIds.length}개 매치 처리하기` }}
          </button>
        </div>

        <!-- 수동 처리 결과 -->
        <div v-if="manualResult" class="bg-green-900/20 border border-green-700/30 rounded p-3 font-mono text-xs space-y-1">
          <div class="text-green-400">✅ 처리 완료</div>
          <div class="text-clan-muted">처리: {{ manualResult.processed }}개 · 저장: {{ manualResult.saved }}건</div>
          <div v-if="manualResult.alreadyProcessed.length" class="text-yellow-400">
            이미 처리됨: {{ manualResult.alreadyProcessed.length }}개
          </div>
          <div v-if="manualResult.skipped.length" class="text-clan-muted">
            제외됨: {{ manualResult.skipped.map(s => `${s.matchId.slice(0,8)}(${s.reason})`).join(', ') }}
          </div>
        </div>
      </div>
    </div>

    <!-- 갱신 확인 모달 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div class="card p-6 max-w-sm w-full animate-slide-up shadow-gold space-y-4">
          <div class="text-center">
            <div class="text-4xl mb-3">🔄</div>
            <h3 class="font-display font-bold text-lg">데이터 갱신 확인</h3>
            <p class="text-sm text-clan-muted mt-2">
              최종 갱신({{ lastSynced }}) 이후 신규 매치를 가져옵니다.<br>
              <span class="text-clan-gold text-xs">경쟁전 매치만 집계됩니다</span><br>
              <span class="text-clan-gold text-xs">예상 소요: {{ estimateTime }}</span>
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
import { syncAllMatches, syncMatchIds } from '@/lib/pubgApi'

const rankingStore = useRankingStore()
const settingsStore = useSettingsStore()
const seasonStore = useSeasonStore()

const syncing = ref(false)
const manualMode = ref(false)
const showConfirm = ref(false)
const showManualSection = ref(false)
const progressMsg = ref('')
const progressPct = ref(0)
const errors = ref([])
const syncResult = ref(null)
const manualResult = ref(null)
const lastError = ref('')
const showEdgeFunctionGuide = ref(false)
const totalMembers = ref(0)
const processedMatches = ref(0)
const autoSyncHour = ref(4)
const apiStatus = ref({ label: '미확인', color: 'text-clan-muted' })
const manualInput = ref('')
const manualIds = ref([])

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

const estimateTime = computed(() => {
  const m = totalMembers.value || 1
  const secs = Math.ceil(m * 2 + m * 20 * 0.4)
  return secs < 60 ? `약 ${secs}초` : `약 ${Math.ceil(secs / 60)}분`
})

function formatSec(sec) {
  return sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`
}

function startTimer() {
  elapsedSec.value = 0
  timerInterval = setInterval(() => {
    elapsedSec.value++
    if (progressPct.value > 5) {
      const totalEst = (elapsedSec.value / progressPct.value) * 100
      estimatedSec.value = Math.max(0, Math.ceil(totalEst - elapsedSec.value))
    }
    if (elapsedSec.value >= 300) forceStop()
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
  lastError.value = `타임아웃: ${formatSec(elapsedSec.value)} 경과 후 강제 중단`
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
    if (e.message.includes('fetch')) showEdgeFunctionGuide.value = true
  }
}

function confirmSync() {
  syncResult.value = null; errors.value = []; lastError.value = ''
  showEdgeFunctionGuide.value = false; showConfirm.value = true
}

function addManualId() {
  const id = manualInput.value.trim()
  if (!id) return
  // URL에서 match_id 추출 (dak.gg URL 붙여넣기 대응)
  const extracted = id.includes('/matches/') ? id.split('/matches/').pop().split('?')[0] : id
  if (manualIds.value.includes(extracted)) return
  manualIds.value.push(extracted)
  manualInput.value = ''
}

// 공통 데이터 로드
async function loadSyncData() {
  const { data: history } = await supabase.from('match_history').select('match_id')
  const processedMatchIds = new Set((history ?? []).map(h => h.match_id))
  const members = await rankingStore.fetchMembers()
  await settingsStore.fetch()
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
  const seasonRange = activeSeason ? { start: activeSeason.started_at, end: new Date().toISOString() } : null
  return { history, processedMatchIds, membersWithAccounts, activeSeason, seasonRange }
}

// 결과 저장 공통
async function saveResults({ results, records, history, activeSeason, processedMatchIds, errs }) {
  // results가 없으면 바로 반환
  if (!results.length && !records.length) return 0

  // match_data 집계 (pubg_name별 합산)
  const aggregated = {}
  for (const r of results) {
    if (!aggregated[r.pubg_name]) {
      aggregated[r.pubg_name] = {
        pubg_name: r.pubg_name, member_id: r.member_id,
        season_id: activeSeason?.id ?? null,
        total_kills: 0, total_assists: 0, total_damage: 0,
        total_survival_time: 0, total_wins: 0, total_games: 0,
        contribution_points: 0, best_player_points: 0,
      }
    }
    const a = aggregated[r.pubg_name]
    a.total_kills         += r.kills ?? 0
    a.total_assists       += r.assists ?? 0
    a.total_damage        += r.damage ?? 0
    a.total_survival_time += r.survivalTime ?? 0
    a.total_wins          += r.winPlace === 1 ? 1 : 0
    a.total_games         += 1
    a.contribution_points += r.contributionPoints ?? 0
    a.best_player_points  += r.bestPlayerPoints ?? 0
  }

  const aggRows = Object.values(aggregated)
  progressMsg.value = `점수 저장 중... (${aggRows.length}명)`

  for (const row of aggRows) {
    if (syncAborted) break
    try {
      const { error } = await supabase.rpc('upsert_match_data', {
        p_pubg_name:      row.pubg_name,
        p_member_id:      row.member_id,
        p_season_id:      row.season_id,
        p_kills:          row.total_kills,
        p_assists:        row.total_assists,
        p_damage:         row.total_damage,
        p_survival_time:  row.total_survival_time,
        p_is_win:         row.total_wins,
        p_contribution:   row.contribution_points,
        p_best_player:    row.best_player_points,
        p_games:          row.total_games,
      })
      if (error) errs.push(`점수저장 실패(${row.pubg_name}): ${error.message}`)
    } catch(e) {
      errs.push(`점수저장 예외(${row.pubg_name}): ${e.message}`)
    }
  }

  // match_records 배치 저장
  if (records.length && !syncAborted) {
    progressMsg.value = `게임 기록 저장 중... (${records.length}건)`
    const recordsWithSeason = records.map(r => ({ ...r, season_id: activeSeason?.id ?? null }))
    for (let i = 0; i < recordsWithSeason.length; i += 100) {
      if (syncAborted) break
      try {
        const { error } = await supabase.from('match_records')
          .upsert(recordsWithSeason.slice(i, i + 100), { onConflict: 'match_id,pubg_name', ignoreDuplicates: true })
        if (error) errs.push(`게임기록 저장 실패: ${error.message}`)
      } catch(e) {
        errs.push(`게임기록 예외: ${e.message}`)
      }
    }
  }

  // match_history 저장
  if (!syncAborted) {
    try {
      const newIds = [...processedMatchIds].filter(id => !(history ?? []).some(h => h.match_id === id))
      if (newIds.length) {
        const { error } = await supabase.from('match_history').insert(
          newIds.map(id => ({ match_id: id, season_id: activeSeason?.id ?? null }))
        )
        if (error) errs.push(`매치히스토리 저장 실패: ${error.message}`)
      }
    } catch(e) {
      errs.push(`매치히스토리 예외: ${e.message}`)
    }
  }

  return aggRows.length
}

async function startSync() {
  showConfirm.value = false
  syncing.value = true; manualMode.value = false
  syncAborted = false; progressPct.value = 0
  progressMsg.value = '준비 중...'; startTimer()
  const startTime = Date.now()

  try {
    console.log('[SYNC] 1. 시작')
    const { history, processedMatchIds, membersWithAccounts, activeSeason, seasonRange } = await loadSyncData()
    console.log('[SYNC] 2. 멤버수:', membersWithAccounts.length, '처리된매치:', processedMatchIds.size, '시즌:', activeSeason?.name)

    const { results, records, errors: errs, processedCount, skippedCount, message } = await syncAllMatches({
      members: membersWithAccounts, settings: settingsStore.settings,
      processedMatchIds, seasonRange,
      onProgress: (msg) => {
        if (syncAborted) return
        progressMsg.value = msg
        progressPct.value = Math.min(progressPct.value + 5, 88)
      }
    })

    if (syncAborted) return
    console.log('[SYNC] 3. results:', results.length, 'records:', records.length, 'skipped:', skippedCount, 'errs:', errs.length)
    progressMsg.value = '점수 저장 중...'; progressPct.value = 92

    const saved = await saveResults({ results, records, history, activeSeason, processedMatchIds, errs })

    console.log('[SYNC] 4. saved:', saved, 'errs:', errs)
    if (!syncAborted) {
      await settingsStore.save({ last_synced_at: new Date().toISOString() })
      await rankingStore.fetchAll(activeSeason?.id)
    }

    const elapsed = Date.now() - startTime
    const elapsedStr = elapsed < 60000 ? `${Math.floor(elapsed/1000)}초` : `${Math.floor(elapsed/60000)}분 ${Math.floor((elapsed%60000)/1000)}초`

    errors.value = errs
    syncResult.value = { processed: processedCount, saved, errCount: errs.length, message: message || (skippedCount > 0 ? `경쟁전 외 ${skippedCount}개 제외` : ''), elapsed: elapsedStr }
    progressPct.value = 100
    processedMatches.value += processedCount
  } catch (e) {
    lastError.value = e.message
    errors.value = [e.message]
    if (e.message.includes('fetch') || e.message.includes('네트워크')) showEdgeFunctionGuide.value = true
  } finally {
    syncing.value = false; stopTimer()
  }
}

async function startManualSync() {
  if (!manualIds.value.length) return
  syncing.value = true; manualMode.value = true
  syncAborted = false; progressPct.value = 0
  progressMsg.value = '준비 중...'; startTimer()
  manualResult.value = null; lastError.value = ''

  try {
    console.log('[SYNC] 1. 시작')
    const { history, processedMatchIds, membersWithAccounts, activeSeason, seasonRange } = await loadSyncData()
    console.log('[SYNC] 2. 멤버수:', membersWithAccounts.length, '처리된매치:', processedMatchIds.size, '시즌:', activeSeason?.name)

    const { results, records, errors: errs, skipped, alreadyProcessed, processedCount } = await syncMatchIds({
      matchIds: manualIds.value,
      members: membersWithAccounts, settings: settingsStore.settings,
      processedMatchIds, seasonRange,
      onProgress: (msg) => {
        if (syncAborted) return
        progressMsg.value = msg
        progressPct.value = Math.min(progressPct.value + 15, 88)
      }
    })

    if (syncAborted) return
    console.log('[SYNC] 3. results:', results.length, 'records:', records.length, 'skipped:', skippedCount, 'errs:', errs.length)
    progressMsg.value = '점수 저장 중...'; progressPct.value = 92

    const saved = await saveResults({ results, records, history, activeSeason, processedMatchIds, errs })

    if (!syncAborted) {
      await rankingStore.fetchAll(activeSeason?.id)
      manualIds.value = []
    }

    manualResult.value = { processed: processedCount, saved, alreadyProcessed, skipped }
    errors.value = errs
    progressPct.value = 100
  } catch (e) {
    lastError.value = e.message
  } finally {
    syncing.value = false; stopTimer()
  }
}

async function toggleAutoSync() {
  await settingsStore.save({ auto_sync_enabled: !settingsStore.settings.auto_sync_enabled })
}
async function saveAutoSync() {
  await settingsStore.save({ auto_sync_hour: autoSyncHour.value })
}
</script>
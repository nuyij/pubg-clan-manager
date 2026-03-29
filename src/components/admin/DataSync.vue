<template>
  <div class="card p-6 space-y-5">
    <div class="section-title">🔄 데이터 동기화</div>

    <!-- API 상태 진단 -->
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
      <div class="bg-clan-surface rounded p-3 text-center cursor-pointer hover:border-clan-gold border border-transparent transition-colors rounded" @click="testApiConnection">
        <div class="font-mono text-sm font-bold" :class="apiStatus.color">{{ apiStatus.label }}</div>
        <div class="text-xs text-clan-muted mt-1">API 상태 (클릭=테스트)</div>
      </div>
    </div>

    <!-- Edge Function 배포 안내 (API 오류 시) -->
    <div v-if="showEdgeFunctionGuide" class="bg-red-900/20 border border-red-700/40 rounded-lg p-4 space-y-3">
      <div class="text-red-400 font-bold text-sm">⚠️ Edge Function이 배포되지 않았습니다</div>
      <div class="text-xs text-clan-muted leading-relaxed">
        PUBG API는 브라우저에서 직접 호출이 불가합니다 (CORS). 아래 명령어로 배포해주세요.
      </div>
      <div class="bg-clan-bg rounded p-3 font-mono text-xs text-green-400 space-y-1">
        <div># VS Code 터미널에서 순서대로 실행</div>
        <div>npm install -g supabase</div>
        <div>supabase login</div>
        <div>supabase init</div>
        <div>supabase secrets set PUBG_API_KEY=<span class="text-yellow-400">여기에PUBG키</span></div>
        <div>supabase functions deploy pubg-proxy --project-ref <span class="text-yellow-400">프로젝트ID</span></div>
      </div>
      <div class="text-xs text-clan-muted">프로젝트 ID: Supabase Dashboard → Settings → General → Reference ID</div>
    </div>

    <!-- 오류 상세 -->
    <div v-if="lastError" class="bg-red-900/20 border border-red-700/30 rounded p-3">
      <div class="text-red-400 text-xs font-mono font-bold mb-1">마지막 오류</div>
      <div class="text-red-300 text-xs font-mono whitespace-pre-wrap">{{ lastError }}</div>
    </div>

    <!-- 갱신 진행 -->
    <div v-if="syncing" class="space-y-2">
      <div class="flex justify-between text-xs font-mono text-clan-muted">
        <span>{{ progressMsg }}</span>
        <span>{{ progressPct }}%</span>
      </div>
      <div class="h-2 bg-clan-surface rounded overflow-hidden">
        <div class="h-full bg-clan-gold transition-all duration-500 rounded" :style="{ width: progressPct + '%' }" />
      </div>
    </div>

    <!-- 에러 로그 -->
    <div v-if="errors.length" class="bg-yellow-900/20 border border-yellow-700/30 rounded p-3 max-h-32 overflow-y-auto">
      <div class="text-yellow-400 text-xs font-mono font-bold mb-2">처리 중 경고 ({{ errors.length }}건)</div>
      <div v-for="(e, i) in errors" :key="i" class="text-yellow-300 text-xs font-mono">{{ e }}</div>
    </div>

    <!-- 완료 메시지 -->
    <div v-if="syncResult" class="bg-green-900/20 border border-green-700/30 rounded p-3 text-sm text-green-400 font-mono">
      ✅ 갱신 완료 — 신규 매치 {{ syncResult.processed }}개 처리 / 경고 {{ syncResult.errCount }}건
      <span v-if="syncResult.message" class="text-clan-muted ml-2 text-xs">{{ syncResult.message }}</span>
    </div>

    <!-- 자동 갱신 설정 -->
    <div class="bg-clan-surface rounded-lg p-4 border border-clan-border space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-sm font-mono text-clan-muted">자동 갱신 (매일 새벽)</span>
        <button
          @click="toggleAutoSync"
          :class="['relative w-12 h-6 rounded-full transition-colors', settingsStore.settings.auto_sync_enabled ? 'bg-clan-gold' : 'bg-clan-border']"
        >
          <div :class="['absolute top-1 w-4 h-4 bg-white rounded-full transition-transform', settingsStore.settings.auto_sync_enabled ? 'translate-x-7' : 'translate-x-1']" />
        </button>
      </div>
      <div v-if="settingsStore.settings.auto_sync_enabled" class="flex items-center gap-3">
        <span class="text-xs text-clan-muted font-mono">갱신 시각</span>
        <select v-model.number="autoSyncHour" @change="saveAutoSync" class="input-field w-24 text-xs">
          <option v-for="h in 24" :key="h-1" :value="h-1">{{ String(h-1).padStart(2,'0') }}:00</option>
        </select>
        <span class="text-xs text-clan-muted">※ Supabase pg_cron 설정 필요 (README 참고)</span>
      </div>
    </div>

    <!-- 갱신 버튼 -->
    <button @click="confirmSync" :disabled="syncing" class="w-full btn-gold flex items-center justify-center gap-2 py-3">
      <svg class="w-5 h-5" :class="syncing ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      {{ syncing ? progressMsg || '갱신 중...' : '🔄 배그 API 데이터 강제 갱신' }}
    </button>

    <!-- 확인 모달 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div class="card p-6 max-w-sm w-full animate-slide-up shadow-gold space-y-4">
          <div class="text-center">
            <div class="text-4xl mb-3">🔄</div>
            <h3 class="font-display font-bold text-lg">데이터 갱신 확인</h3>
            <p class="text-sm text-clan-muted mt-2">현재 활성 시즌의 마지막 갱신 이후 매치를 가져옵니다.<br>클랜원 수에 따라 수 분이 걸릴 수 있습니다.</p>
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
import { ref, computed, onMounted } from 'vue'
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

const lastSynced = computed(() => {
  const ts = settingsStore.settings.last_synced_at
  if (!ts) return '없음'
  return new Date(ts).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
})

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
  showEdgeFunctionGuide.value = false
  lastError.value = ''
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pubg-proxy?path=${encodeURIComponent('/players?filter[playerNames]=test')}`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
    })
    if (res.status === 404 && (await res.text()).includes('not found')) {
      throw new Error('Edge Function이 배포되지 않았습니다')
    }
    // 401은 API키 문제, 404플레이어는 정상 (함수는 동작)
    apiStatus.value = { label: '✓ 연결됨', color: 'text-green-400' }
  } catch (e) {
    apiStatus.value = { label: '✗ 오류', color: 'text-red-400' }
    lastError.value = e.message
    if (e.message.includes('Edge Function') || e.message.includes('fetch')) {
      showEdgeFunctionGuide.value = true
    }
  }
}

function confirmSync() {
  syncResult.value = null; errors.value = []; lastError.value = ''
  showEdgeFunctionGuide.value = false; showConfirm.value = true
}

async function startSync() {
  showConfirm.value = false
  syncing.value = true; progressPct.value = 0

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
    const seasonRange = activeSeason ? { start: activeSeason.started_at, end: new Date().toISOString() } : null

    const { results, records, errors: errs, processedCount, message } = await syncAllMatches({
      members: membersWithAccounts, settings: settingsStore.settings, processedMatchIds, seasonRange,
      onProgress: (msg) => { progressMsg.value = msg; progressPct.value = Math.min(progressPct.value + 8, 90) }
    })

    progressMsg.value = '점수 저장 중...'; progressPct.value = 95

    progressMsg.value = '점수 집계 중...'

    // match_data 집계: pubg_name별로 합산
    const aggregated = {}
    for (const r of results) {
      const member = membersWithAccounts.find(m =>
        m.pubg_accounts?.some(a => a.pubg_name === r.pubg_name) || m.pubg_name === r.pubg_name
      )
      const key = r.pubg_name
      if (!aggregated[key]) {
        aggregated[key] = {
          pubg_name: r.pubg_name,
          member_id: member?.id ?? null,
          season_id: activeSeason?.id ?? null,
          total_kills: 0, total_assists: 0, total_damage: 0,
          total_survival_time: 0, total_wins: 0, total_games: 0,
          contribution_points: 0, best_player_points: 0,
          updated_at: new Date().toISOString(),
        }
      }
      const agg = aggregated[key]
      agg.total_kills         += r.kills
      agg.total_assists       += r.assists
      agg.total_damage        += r.damage
      agg.total_survival_time += r.survivalTime
      agg.total_wins          += r.winPlace === 1 ? 1 : 0
      agg.total_games         += 1
      agg.contribution_points += r.contributionPoints
      agg.best_player_points  += r.bestPlayerPoints
    }

    // match_data 배치 upsert (한 번에)
    const aggRows = Object.values(aggregated)
    if (aggRows.length) {
      // 기존 데이터와 합산
      for (const row of aggRows) {
        let q = supabase.from('match_data').select('*').eq('pubg_name', row.pubg_name)
        if (row.season_id) q = q.eq('season_id', row.season_id)
        else q = q.is('season_id', null)
        const { data: existing } = await q.maybeSingle()

        if (existing) {
          let uq = supabase.from('match_data').update({
            total_kills:         existing.total_kills + row.total_kills,
            total_assists:       existing.total_assists + row.total_assists,
            total_damage:        existing.total_damage + row.total_damage,
            total_survival_time: existing.total_survival_time + row.total_survival_time,
            total_wins:          existing.total_wins + row.total_wins,
            total_games:         existing.total_games + row.total_games,
            contribution_points: existing.contribution_points + row.contribution_points,
            best_player_points:  existing.best_player_points + row.best_player_points,
            updated_at:          new Date().toISOString(),
          }).eq('pubg_name', row.pubg_name)
          if (row.season_id) uq = uq.eq('season_id', row.season_id)
          else uq = uq.is('season_id', null)
          await uq
        } else {
          await supabase.from('match_data').insert(row)
        }
      }
    }

    // match_records 배치 upsert (한 번에)
    if (records.length) {
      const recordsWithSeason = records.map(r => ({
        ...r,
        season_id: activeSeason?.id ?? null,
      }))
      // 100건씩 나눠서 저장 (Supabase 제한)
      for (let i = 0; i < recordsWithSeason.length; i += 100) {
        const chunk = recordsWithSeason.slice(i, i + 100)
        const { error: recErr } = await supabase
          .from('match_records')
          .upsert(chunk, { onConflict: 'match_id,pubg_name', ignoreDuplicates: true })
        if (recErr) errs.push(`게임기록 저장 실패: ${recErr.message}`)
      }
    }

    // 매치 히스토리 저장
    const newIds = [...processedMatchIds].filter(id => !(history ?? []).some(h => h.match_id === id))
    if (newIds.length) {
      await supabase.from('match_history').insert(
        newIds.map(id => ({ match_id: id, season_id: activeSeason?.id ?? null }))
      )
    }

    await settingsStore.save({ last_synced_at: new Date().toISOString() })
    await rankingStore.fetchAll(activeSeason?.id)

    errors.value = errs
    syncResult.value = { processed: processedCount, errCount: errs.length, message }
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
  }
}

async function toggleAutoSync() {
  await settingsStore.save({ auto_sync_enabled: !settingsStore.settings.auto_sync_enabled })
}

async function saveAutoSync() {
  await settingsStore.save({ auto_sync_hour: autoSyncHour.value })
}
</script>

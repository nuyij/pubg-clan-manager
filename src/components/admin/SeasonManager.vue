<template>
  <div class="card p-6 space-y-5">
    <div class="section-title">🏆 시즌 관리</div>

    <!-- 현재 시즌 -->
    <div v-if="season.activeSeason" class="bg-gradient-to-r from-yellow-900/20 to-clan-surface border border-clan-gold/30 rounded-lg p-4 flex items-center justify-between gap-4">
      <div>
        <div class="font-display font-bold text-clan-gold text-lg">{{ season.activeSeason.name }}</div>
        <div class="text-xs text-clan-muted font-mono mt-1">
          시작: {{ formatDate(season.activeSeason.started_at) }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-1 bg-green-900/40 border border-green-700/30 rounded text-xs text-green-400 font-mono">진행 중</span>
        <button @click="showEndConfirm = true" class="text-xs px-3 py-1.5 border border-red-700/40 text-red-400 hover:bg-red-900/30 rounded transition-colors">시즌 종료</button>
      </div>
    </div>
    <div v-else class="bg-clan-surface rounded-lg p-4 text-center text-clan-muted text-sm">
      현재 활성 시즌이 없습니다
    </div>

    <!-- 새 시즌 시작 -->
    <div class="bg-clan-surface rounded-lg p-4 border border-clan-border space-y-3">
      <div class="text-xs text-clan-muted font-mono tracking-wider">새 시즌 시작</div>
      <div class="flex gap-2">
        <input v-model="newSeasonName" type="text" :placeholder="`시즌 ${(season.seasons.length + 1)}`" class="input-field flex-1" />
        <button @click="startSeason" :disabled="starting" class="btn-gold whitespace-nowrap px-5">
          {{ starting ? '생성 중...' : '시즌 시작' }}
        </button>
      </div>
      <div class="text-xs text-clan-muted">※ 새 시즌 시작 시 현재 시즌이 자동 종료됩니다. 기존 데이터는 보존됩니다.</div>
    </div>

    <!-- 시즌 이력 -->
    <div v-if="season.seasons.length" class="card overflow-hidden">
      <div class="px-4 py-2 border-b border-clan-border text-xs text-clan-muted font-mono">시즌 이력</div>
      <div v-for="s in season.seasons" :key="s.id"
        class="px-4 py-3 border-b border-clan-border/50 last:border-0 flex items-center gap-3 hover:bg-clan-surface/40 cursor-pointer"
        @click="season.selectSeason(s.id)">
        <div class="flex-1">
          <div class="text-sm font-bold" :class="s.is_active ? 'text-clan-gold' : 'text-clan-text'">
            {{ s.name }} <span v-if="s.is_active" class="text-xs text-green-400 font-mono ml-1">(현재)</span>
          </div>
          <div class="text-xs text-clan-muted font-mono">
            {{ formatDate(s.started_at) }} ~ {{ s.ended_at ? formatDate(s.ended_at) : '진행 중' }}
          </div>
        </div>
        <span v-if="season.selectedSeasonId === s.id" class="text-xs text-clan-gold">👁 보는 중</span>
      </div>
    </div>

    <!-- 시즌 종료 확인 모달 -->
    <Teleport to="body">
      <div v-if="showEndConfirm" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div class="card p-6 max-w-sm w-full animate-slide-up space-y-4">
          <div class="text-center">
            <div class="text-4xl mb-3">🏁</div>
            <h3 class="font-display font-bold text-lg">시즌 종료 확인</h3>
            <p class="text-sm text-clan-muted mt-2">
              <span class="text-clan-text font-bold">{{ season.activeSeason?.name }}</span>을 종료합니다.<br>
              데이터는 보존되며 과거 시즌으로 조회 가능합니다.
            </p>
          </div>
          <div class="flex gap-3">
            <button @click="showEndConfirm = false" class="flex-1 btn-outline">취소</button>
            <button @click="endSeason" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-sm transition-colors">종료</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSeasonStore } from '@/stores/season'
import { useRankingStore } from '@/stores/ranking'

const season = useSeasonStore()
const ranking = useRankingStore()
const newSeasonName = ref('')
const starting = ref(false)
const showEndConfirm = ref(false)

async function startSeason() {
  starting.value = true
  try {
    const name = newSeasonName.value.trim() || `시즌 ${season.seasons.length + 1}`
    await season.startNewSeason(name)
    newSeasonName.value = ''
    await ranking.fetchAll(season.activeSeason?.id)
  } catch (e) { alert('시즌 시작 오류: ' + e.message) }
  finally { starting.value = false }
}

async function endSeason() {
  showEndConfirm.value = false
  try {
    await season.endCurrentSeason()
  } catch (e) { alert('시즌 종료 오류: ' + e.message) }
}

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('ko-KR') : '-'
</script>

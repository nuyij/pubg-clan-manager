<template>
  <div class="card p-6 space-y-5">
    <div class="section-title">🎲 럭키 드로우</div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-xs text-clan-muted mb-2 font-mono tracking-wider">최소 기여도 점수 (이상)</label>
        <input v-model.number="form.minPoints" type="number" min="0" class="input-field" @change="saveConfig" />
      </div>
      <div>
        <label class="block text-xs text-clan-muted mb-2 font-mono tracking-wider">추첨 인원 (명)</label>
        <input v-model.number="form.drawCount" type="number" min="1" max="10" class="input-field" @change="saveConfig" />
      </div>
    </div>
    <!-- 대상자 -->
    <div class="bg-clan-surface rounded p-4 border border-clan-border">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-mono text-clan-muted">추첨 대상자</span>
        <span class="text-sm font-mono text-clan-gold">{{ pool.length }}명</span>
      </div>
      <div v-if="pool.length" class="flex flex-wrap gap-2">
        <span v-for="p in pool" :key="p.pubg_name"
          class="text-xs px-2 py-1 bg-clan-card border border-clan-border rounded font-mono text-clan-text-dim">
          {{ p.pubg_name }} <span class="text-clan-gold">{{ p.contribution_points }}점</span>
        </span>
      </div>
      <div v-else class="text-center text-clan-muted text-sm py-2">조건에 맞는 대상자가 없습니다</div>
    </div>
    <button @click="startDraw" :disabled="pool.length < form.drawCount || drawing"
      class="w-full btn-gold py-4 text-lg flex items-center justify-center gap-3">
      <span class="text-2xl" :class="drawing ? 'animate-spin-slow' : ''">🎲</span>
      {{ drawing ? '추첨 중...' : '추첨하기' }}
    </button>
    <div v-if="pool.length < form.drawCount" class="text-center text-red-400 text-xs font-mono">
      대상자({{ pool.length }}명)가 추첨 인원({{ form.drawCount }}명)보다 적습니다
    </div>
    <!-- 최근 이력 -->
    <div v-if="lastDraw" class="border-t border-clan-border pt-4">
      <div class="text-xs text-clan-muted font-mono mb-2">최근 추첨 결과</div>
      <div class="flex items-center gap-2 flex-wrap">
        <span v-for="w in lastDraw.winners" :key="w"
          class="text-xs px-2 py-1 bg-yellow-900/20 border border-yellow-700/30 rounded font-mono text-yellow-400">{{ w }}</span>
        <span class="text-xs text-clan-muted ml-auto">{{ formatDate(lastDraw.drawn_at) }}</span>
      </div>
    </div>

    <!-- 당첨자 모달 -->
    <Teleport to="body">
      <div v-if="showResult" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
        <div class="card p-8 max-w-md w-full space-y-6 border-clan-gold/30 shadow-gold">
          <div class="text-center"><div class="text-5xl mb-3">🎉</div>
            <h3 class="font-display text-2xl font-bold text-clan-gold tracking-widest">당첨자 발표</h3></div>
          <div class="space-y-3">
            <div v-for="(w, i) in winners" :key="w"
              :style="{ animationDelay: `${i*0.15}s`, opacity: 0 }"
              class="winner-card bg-gradient-to-r from-yellow-900/40 to-clan-surface border border-clan-gold/50 rounded-lg p-4 flex items-center gap-4">
              <div class="text-2xl">{{ ['🥇','🥈','🥉'][i] ?? '🏆' }}</div>
              <div class="font-display font-bold text-lg text-clan-text">{{ w }}</div>
              <div class="ml-auto font-mono text-xs text-clan-gold">{{ pool.find(p=>p.pubg_name===w)?.contribution_points ?? 0 }}점</div>
            </div>
          </div>
          <div class="flex gap-3">
            <button @click="showResult = false" class="flex-1 btn-outline">닫기</button>
            <button @click="publishResult" class="flex-1 btn-gold">📢 메인에 공지</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { useSettingsStore } from '@/stores/settings'
const ranking = useRankingStore()
const store = useSettingsStore()
const form = ref({ minPoints: 50, drawCount: 3 })
const drawing = ref(false)
const showResult = ref(false)
const winners = ref([])
const pool = computed(() => ranking.getLuckyDrawPool(form.value.minPoints))
const lastDraw = computed(() => store.settings.last_lucky_draw)
onMounted(() => { form.value.minPoints = store.settings.lucky_draw_min_points ?? 50; form.value.drawCount = store.settings.lucky_draw_count ?? 3 })
async function saveConfig() { await store.save({ lucky_draw_min_points: form.value.minPoints, lucky_draw_count: form.value.drawCount }) }
function startDraw() {
  if (pool.value.length < form.value.drawCount) return
  drawing.value = true
  setTimeout(() => { winners.value = [...pool.value].sort(() => Math.random() - 0.5).slice(0, form.value.drawCount).map(p => p.pubg_name); drawing.value = false; showResult.value = true }, 700)
}
async function publishResult() { await store.save({ last_lucky_draw: { winners: winners.value, drawn_at: new Date().toISOString() } }); showResult.value = false }
const formatDate = (iso) => iso ? new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
</script>

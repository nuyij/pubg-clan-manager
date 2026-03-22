<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="card max-w-md w-full p-6 animate-slide-up shadow-gold space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-display font-bold text-lg text-clan-gold tracking-wider">💡 점수 산출 공식</h3>
          <button @click="$emit('close')" class="text-clan-muted hover:text-clan-text">✕</button>
        </div>
        <div v-if="type === 'contribution'" class="space-y-3">
          <div class="bg-clan-surface rounded p-3 font-mono text-xs text-clan-text-dim leading-relaxed">
            기여도 = 생존시간(분) × 인원수 × 가산율<br><br>
            <span class="text-clan-gold">· 파티(2명 이상)일 때만 부여</span><br>
            <span class="text-clan-gold">· 오래 함께 살아있을수록 높은 점수</span><br>
            <span class="text-yellow-500">· 신규/텟생 동반 시 × {{ s.settings.newbie_bonus }}</span>
          </div>
          <div class="bg-clan-surface rounded p-2 text-xs text-clan-muted font-mono">
            예시: 3명 파티, 생존시간 10분 → 10 × 3 = 30점
          </div>
          <div class="text-xs text-yellow-400 bg-yellow-900/20 rounded p-2">⭐ 럭키드로우 기준: {{ s.settings.lucky_draw_min_points }}점 이상</div>
        </div>
        <div v-else-if="type === 'bestplayer'" class="space-y-3">
          <div class="bg-clan-surface rounded p-3 font-mono text-xs text-clan-text-dim leading-relaxed">
            점수 = (킬 × {{ s.settings.kill_weight }}) + (어시 × {{ s.settings.assist_weight }}) + 순위점수
          </div>
          <div class="grid grid-cols-5 gap-1">
            <div v-for="r in s.getRankScoresArray()" :key="r.rank" class="bg-clan-surface rounded p-1 text-center">
              <div class="text-clan-muted text-[10px]">{{ r.rank }}위</div>
              <div class="text-clan-gold font-mono text-xs">{{ r.score }}</div>
            </div>
          </div>
        </div>
        <div v-else-if="type === 'mosttime'" class="bg-clan-surface rounded p-3 font-mono text-xs text-clan-text-dim leading-relaxed">
          생존 시간(초) 누적 합계<br>표시 형식: 00시간 00분
        </div>
        <button @click="$emit('close')" class="w-full btn-outline">닫기</button>
      </div>
    </div>
  </Teleport>
</template>
<script setup>
import { useSettingsStore } from '@/stores/settings'
defineProps({ show: Boolean, type: { type: String, default: 'contribution' } })
defineEmits(['close'])
const s = useSettingsStore()
</script>

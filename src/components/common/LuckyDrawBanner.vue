<template>
  <div v-if="lastDraw?.winners?.length" class="bg-gradient-to-r from-yellow-900/40 via-clan-card to-yellow-900/40 border-y border-clan-gold/30">
    <div class="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <span class="text-clan-gold font-display font-bold tracking-widest text-xs flex items-center gap-1.5">
        🎲 LUCKY DRAW
      </span>
      <div class="flex gap-2 flex-wrap">
        <span v-for="w in lastDraw.winners" :key="w"
          class="px-2 py-0.5 bg-clan-gold/20 border border-clan-gold/40 rounded font-mono text-xs text-yellow-300">
          {{ w }}
        </span>
      </div>
      <span class="text-clan-muted text-xs ml-auto">{{ formatDate(lastDraw.drawn_at) }}</span>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
const s = useSettingsStore()
const lastDraw = computed(() => s.settings.last_lucky_draw)
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

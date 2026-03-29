<template>
  <div class="animate-slide-up">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="font-display text-2xl font-bold text-clan-text tracking-widest">최장 플레이어</h2>
        <p class="text-clan-muted text-sm mt-1">매치 내 누적 생존 시간 합계</p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="ranking.useSample" class="text-[10px] px-2 py-1 bg-yellow-900/40 border border-yellow-700/40 rounded font-mono text-yellow-400">샘플 데이터</span>
        <button @click="showTip=true" class="btn-outline text-xs">💡 Tip</button>
      </div>
    </div>
    <div v-if="ranking.loading" class="flex justify-center py-20"><div class="w-8 h-8 border-2 border-clan-gold border-t-transparent rounded-full animate-spin" /></div>
    <div v-else-if="!ranking.mostTimeRanking.length" class="text-center py-20 text-clan-muted"><div class="text-5xl mb-4">⏱️</div><p class="font-display tracking-wider">아직 기록된 데이터가 없습니다</p></div>
    <div v-else class="card overflow-hidden">
      <div v-for="item in ranking.mostTimeRanking" :key="item.display_name"
        class="border-b border-clan-border/50 last:border-0 px-4 py-4 hover:bg-clan-surface/40 transition-colors relative cursor-pointer"
        @click="openDetail(item)">
        <div class="absolute inset-y-0 left-0 opacity-10 transition-all duration-700"
          :class="item.rank===1?'bg-yellow-500':'bg-clan-gold'" :style="{ width: barWidth(item.total_survival_time) }" />
        <div class="relative flex items-center gap-4">
          <span :class="['rank-badge text-xs font-mono', item.rank===1?'rank-1':item.rank===2?'rank-2':item.rank===3?'rank-3':'rank-other']">{{ item.rank }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-clan-text truncate">{{ item.display_name }}</div>
            <div class="font-mono text-xs text-clan-muted">
              {{ item.total_games ?? 0 }}게임 · 평균 {{ avgMin(item) }}분/게임
              <span v-if="item.pubg_names?.length > 1" class="ml-1">({{ item.pubg_names.length }}계정)</span>
            </div>
          </div>
          <div class="font-mono font-bold text-base" :class="item.rank===1?'text-yellow-400':'text-clan-gold'">{{ item.timeFormatted }}</div>
        </div>
      </div>
    </div>
    <TipModal :show="showTip" type="mosttime" @close="showTip=false" />
    <MemberDetailModal v-if="selectedMember" :member="selectedMember" rank-type="mosttime" @close="selectedMember=null" />
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { supabase } from '@/lib/supabase'
import TipModal from '@/components/common/TipModal.vue'
import MemberDetailModal from '@/components/common/MemberDetailModal.vue'
const ranking = useRankingStore()
const showTip = ref(false)
const selectedMember = ref(null)
const maxTime = computed(() => ranking.mostTimeRanking[0]?.total_survival_time ?? 1)
const barWidth = (s) => `${(s/maxTime.value)*100}%`
const avgMin = (item) => item.total_games ? Math.floor(item.total_survival_time/item.total_games/60) : 0
async function openDetail(item) {
  if (ranking.useSample) return
  const { data } = await supabase.from('members').select('*, member_pubg_accounts(*)').eq('id', item.member_id).single()
  if (data) selectedMember.value = data
}
</script>

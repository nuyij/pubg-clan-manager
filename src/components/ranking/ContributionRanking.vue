<template>
  <div class="animate-slide-up">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="font-display text-2xl font-bold text-clan-text tracking-widest">기여도 순위</h2>
        <p class="text-clan-muted text-sm mt-1">클랜원과 함께한 파티 플레이 · 생존시간 기반</p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="ranking.useSample" class="text-[10px] px-2 py-1 bg-yellow-900/40 border border-yellow-700/40 rounded font-mono text-yellow-400">샘플 데이터</span>
        <button @click="showTip=true" class="btn-outline text-xs">💡 Tip</button>
      </div>
    </div>
    <div v-if="ranking.loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-clan-gold border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else-if="!ranking.contributionRanking.length" class="text-center py-20 text-clan-muted">
      <div class="text-5xl mb-4">🎮</div>
      <p class="font-display tracking-wider">아직 기록된 데이터가 없습니다</p>
    </div>
    <div v-else class="space-y-3">
      <!-- TOP 3 -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div v-for="item in ranking.contributionRanking.slice(0,3)" :key="item.display_name"
          :class="['card p-4 text-center relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity', topClass(item.rank)]"
          @click="openDetail(item)">
          <div class="text-3xl mb-2">{{ ['🥇','🥈','🥉'][item.rank-1] }}</div>
          <div class="font-mono text-xs text-clan-muted mb-1">RANK #{{ item.rank }}</div>
          <div class="font-display font-bold text-sm text-clan-text truncate">{{ item.display_name }}</div>
          <div v-if="item.pubg_names?.length > 1" class="text-[10px] text-clan-muted mt-0.5">{{ item.pubg_names.length }}계정</div>
          <div class="font-mono text-2xl font-bold mt-2"
            :class="item.rank===1?'text-yellow-400':item.rank===2?'text-gray-300':'text-amber-600'">
            {{ item.contribution_points.toLocaleString() }}
          </div>
          <div class="text-clan-muted text-xs">점</div>
        </div>
      </div>
      <!-- 4위 이하 -->
      <div class="card overflow-hidden">
        <table class="w-full">
          <thead><tr class="border-b border-clan-border">
            <th class="px-4 py-3 text-left text-xs text-clan-muted font-display tracking-widest w-12">순위</th>
            <th class="px-4 py-3 text-left text-xs text-clan-muted font-display tracking-widest">닉네임</th>
            <th class="px-4 py-3 text-right text-xs text-clan-muted font-display tracking-widest">점수</th>
            <th class="px-4 py-3 text-right text-xs text-clan-muted font-display tracking-widest hidden sm:table-cell">게임수</th>
          </tr></thead>
          <tbody>
            <tr v-for="item in ranking.contributionRanking.slice(3)" :key="item.display_name"
              class="border-b border-clan-border/50 hover:bg-clan-surface/50 transition-colors cursor-pointer"
              @click="openDetail(item)">
              <td class="px-4 py-3"><span class="rank-badge rank-other font-mono text-xs">{{ item.rank }}</span></td>
              <td class="px-4 py-3">
                <div class="text-sm text-clan-text">{{ item.display_name }}</div>
                <div v-if="item.pubg_names?.length > 1" class="text-[10px] text-clan-muted font-mono">{{ item.pubg_names.join(' · ') }}</div>
              </td>
              <td class="px-4 py-3 text-right font-mono text-sm text-clan-gold">{{ item.contribution_points.toLocaleString() }}점</td>
              <td class="px-4 py-3 text-right font-mono text-xs text-clan-muted hidden sm:table-cell">{{ item.total_games ?? 0 }}판</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card p-4 border-clan-gold/30 bg-yellow-900/10 flex items-center gap-3">
        <span class="text-xl">🎲</span>
        <div class="text-sm">
          <span class="text-clan-gold font-bold">럭키드로우 대상:</span>
          <span class="text-clan-text-dim ml-2">{{ settings.settings.lucky_draw_min_points }}점 이상 ({{ pool.length }}명 해당)</span>
        </div>
      </div>
    </div>
    <TipModal :show="showTip" type="contribution" @close="showTip=false" />
    <MemberDetailModal v-if="selectedMember" :member="selectedMember" @close="selectedMember=null" />
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { useSettingsStore } from '@/stores/settings'
import { supabase } from '@/lib/supabase'
import TipModal from '@/components/common/TipModal.vue'
import MemberDetailModal from '@/components/common/MemberDetailModal.vue'
const ranking = useRankingStore()
const settings = useSettingsStore()
const showTip = ref(false)
const selectedMember = ref(null)
const pool = computed(() => ranking.getLuckyDrawPool(settings.settings.lucky_draw_min_points ?? 50))
const topClass = (r) => r===1?'border-yellow-500/50 shadow-gold':r===2?'border-gray-400/30':'border-amber-700/30'
async function openDetail(item) {
  if (ranking.useSample) return
  const { data } = await supabase.from('members').select('*, member_pubg_accounts(*)').eq('id', item.member_id).single()
  if (data) selectedMember.value = data
}
</script>

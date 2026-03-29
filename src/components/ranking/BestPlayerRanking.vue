<template>
  <div class="animate-slide-up">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="font-display text-2xl font-bold text-clan-text tracking-widest">베스트 플레이어</h2>
        <p class="text-clan-muted text-sm mt-1">킬·어시·순위 기반 종합 전투력 (판당 평균 포함)</p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="ranking.useSample" class="text-[10px] px-2 py-1 bg-yellow-900/40 border border-yellow-700/40 rounded font-mono text-yellow-400">샘플 데이터</span>
        <button @click="showTip=true" class="btn-outline text-xs">💡 Tip</button>
      </div>
    </div>
    <div v-if="ranking.loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-clan-gold border-t-transparent rounded-full animate-spin" />
    </div>
    <div v-else-if="!ranking.bestPlayerRanking.length" class="text-center py-20 text-clan-muted">
      <div class="text-5xl mb-4">🔫</div><p class="font-display tracking-wider">아직 기록된 데이터가 없습니다</p>
    </div>
    <div v-else class="card overflow-hidden">
      <div class="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem_4rem] gap-2 px-4 py-2 border-b border-clan-border bg-clan-surface">
        <div class="text-xs text-clan-muted font-display tracking-widest">#</div>
        <div class="text-xs text-clan-muted font-display tracking-widest">닉네임</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right">총점</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden sm:block">킬/어시</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden md:block">평균K/D</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden md:block">평균딜</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden lg:block">게임수</div>
      </div>
      <div v-for="item in ranking.bestPlayerRanking" :key="item.display_name"
        :class="['grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem_4rem] gap-2 px-4 py-3 border-b border-clan-border/50 last:border-0 transition-colors items-center cursor-pointer',
          item.rank===1 ? 'bg-gradient-to-r from-yellow-900/20 to-transparent border-l-2 border-l-yellow-500 hover:from-yellow-900/30' : 'hover:bg-clan-surface/50']"
        @click="openDetail(item)">
        <div>
          <span v-if="item.rank===1" class="text-lg">👑</span>
          <span v-else :class="['rank-badge text-xs font-mono', item.rank===2?'rank-2':item.rank===3?'rank-3':'rank-other']">{{ item.rank }}</span>
        </div>
        <div class="min-w-0">
          <div class="text-sm font-bold truncate" :class="item.rank===1?'text-yellow-300':'text-clan-text'">{{ item.display_name }}</div>
          <div v-if="item.pubg_names?.length > 1" class="text-[10px] text-clan-muted font-mono truncate">{{ item.pubg_names.join(' · ') }}</div>
        </div>
        <div class="text-right font-mono font-bold" :class="item.rank===1?'text-yellow-400':'text-clan-gold'">{{ Math.floor(item.best_player_points).toLocaleString() }}</div>
        <div class="text-right hidden sm:block">
          <span class="font-mono text-sm text-red-400">{{ item.total_kills }}</span>
          <span class="text-clan-muted text-xs mx-0.5">/</span>
          <span class="font-mono text-sm text-blue-400">{{ item.total_assists }}</span>
        </div>
        <div class="text-right hidden md:block">
          <div class="font-mono text-sm text-orange-300">{{ avgKD(item) }}</div>
          <div class="text-[10px] text-clan-muted">K/D</div>
        </div>
        <div class="text-right hidden md:block">
          <div class="font-mono text-sm text-green-400">{{ avgDmg(item) }}</div>
          <div class="text-[10px] text-clan-muted">평균딜</div>
        </div>
        <div class="text-right hidden lg:block font-mono text-xs text-clan-muted">{{ item.total_games ?? 0 }}판</div>
      </div>
    </div>
    <TipModal :show="showTip" type="bestplayer" @close="showTip=false" />
    <MemberDetailModal v-if="selectedMember" :member="selectedMember" @close="selectedMember=null" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { supabase } from '@/lib/supabase'
import TipModal from '@/components/common/TipModal.vue'
import MemberDetailModal from '@/components/common/MemberDetailModal.vue'
const ranking = useRankingStore()
const showTip = ref(false)
const selectedMember = ref(null)
const avgKD = (item) => item.total_games ? (item.total_kills / item.total_games).toFixed(2) : '0.00'
const avgDmg = (item) => item.total_games ? Math.floor(item.total_damage / item.total_games).toLocaleString() : '0'
async function openDetail(item) {
  if (ranking.useSample) return
  const { data } = await supabase.from('members').select('*, member_pubg_accounts(*)').eq('id', item.member_id).single()
  if (data) selectedMember.value = data
}
</script>

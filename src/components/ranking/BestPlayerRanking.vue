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
      <div class="text-5xl mb-4">🔫</div>
      <p class="font-display tracking-wider">아직 기록된 데이터가 없습니다</p>
    </div>

    <div v-else class="card overflow-hidden">
      <!-- 헤더 -->
      <div class="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem_5rem] gap-2 px-4 py-2 border-b border-clan-border bg-clan-surface">
        <div class="text-xs text-clan-muted font-display tracking-widest">#</div>
        <div class="text-xs text-clan-muted font-display tracking-widest">닉네임</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right">총점</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden sm:block">킬/어시</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden md:block">평균K/D</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden md:block">평균딜</div>
        <div class="text-xs text-clan-muted font-display tracking-widest text-right hidden lg:block">게임수</div>
      </div>

      <!-- 목록 (1위 포함 전체 동일 형식) -->
      <div
        v-for="item in ranking.bestPlayerRanking"
        :key="item.display_name"
        :class="[
          'grid grid-cols-[2rem_1fr_5rem_5rem_5rem_5rem_5rem] gap-2 px-4 py-3 border-b border-clan-border/50 last:border-0 transition-colors items-center',
          item.rank === 1
            ? 'bg-gradient-to-r from-yellow-900/20 to-transparent border-l-2 border-l-yellow-500'
            : 'hover:bg-clan-surface/50'
        ]"
      >
        <!-- 순위 -->
        <div>
          <span v-if="item.rank === 1" class="text-lg">👑</span>
          <span v-else :class="['rank-badge text-xs font-mono', item.rank===2?'rank-2':item.rank===3?'rank-3':'rank-other']">
            {{ item.rank }}
          </span>
        </div>

        <!-- 닉네임 -->
        <div class="min-w-0">
          <div class="text-sm font-bold text-clan-text truncate" :class="item.rank===1?'text-yellow-300':''">
            {{ item.display_name }}
          </div>
          <div v-if="item.pubg_names?.length > 1" class="text-[10px] text-clan-muted font-mono truncate">
            {{ item.pubg_names.join(' · ') }}
          </div>
        </div>

        <!-- 총점 -->
        <div class="text-right font-mono font-bold" :class="item.rank===1?'text-yellow-400':'text-clan-gold'">
          {{ Math.floor(item.best_player_points).toLocaleString() }}
        </div>

        <!-- 킬/어시 -->
        <div class="text-right hidden sm:block">
          <span class="font-mono text-sm text-red-400">{{ item.total_kills }}</span>
          <span class="text-clan-muted text-xs mx-0.5">/</span>
          <span class="font-mono text-sm text-blue-400">{{ item.total_assists }}</span>
        </div>

        <!-- 평균 K/D (판당 킬) -->
        <div class="text-right hidden md:block">
          <div class="font-mono text-sm text-orange-300">{{ avgKD(item) }}</div>
          <div class="text-[10px] text-clan-muted">K/D</div>
        </div>

        <!-- 평균 딜 -->
        <div class="text-right hidden md:block">
          <div class="font-mono text-sm text-green-400">{{ avgDmg(item) }}</div>
          <div class="text-[10px] text-clan-muted">평균딜</div>
        </div>

        <!-- 게임수 -->
        <div class="text-right hidden lg:block font-mono text-xs text-clan-muted">
          {{ item.total_games ?? 0 }}판
        </div>
      </div>
    </div>

    <TipModal :show="showTip" type="bestplayer" @close="showTip=false" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import TipModal from '@/components/common/TipModal.vue'

const ranking = useRankingStore()
const showTip = ref(false)

// 판당 평균 K/D (킬/게임수)
function avgKD(item) {
  if (!item.total_games) return '0.00'
  return (item.total_kills / item.total_games).toFixed(2)
}

// 판당 평균 딜
function avgDmg(item) {
  if (!item.total_games) return '0'
  return Math.floor(item.total_damage / item.total_games).toLocaleString()
}
</script>

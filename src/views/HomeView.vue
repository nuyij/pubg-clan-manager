<template>
  <div class="animate-fade-in space-y-6">
    <!-- 배그 ID 검색 바 -->
    <div class="card p-4">
      <div class="text-xs text-clan-muted font-mono tracking-wider mb-3">🔍 배그 ID로 클랜원 검색</div>
      <PlayerSearch />
    </div>

    <!-- 시즌 선택 (모바일) -->
    <div v-if="season.seasons.length > 1" class="sm:hidden">
      <select :value="season.selectedSeasonId" @change="onSeasonChange($event.target.value)"
        class="input-field w-full text-sm">
        <option v-for="s in season.seasons" :key="s.id" :value="s.id">
          {{ s.name }}{{ s.is_active ? ' (현재)' : '' }}
        </option>
      </select>
    </div>

    <!-- 탭 -->
    <div class="border-b border-clan-border">
      <div class="flex">
        <button v-for="tab in tabs" :key="tab.key"
          :class="['tab-btn', activeTab===tab.key ? 'active' : '']"
          @click="activeTab=tab.key">
          <span class="mr-1.5">{{ tab.icon }}</span>{{ tab.label }}
        </button>
      </div>
    </div>

    <Transition name="tab-fade" mode="out-in">
      <ContributionRanking v-if="activeTab==='contribution'" />
      <BestPlayerRanking   v-else-if="activeTab==='bestplayer'" />
      <MostTimeRanking     v-else-if="activeTab==='mosttime'" />
    </Transition>
  </div>
</template>
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { useSettingsStore } from '@/stores/settings'
import { useSeasonStore } from '@/stores/season'
import ContributionRanking from '@/components/ranking/ContributionRanking.vue'
import BestPlayerRanking from '@/components/ranking/BestPlayerRanking.vue'
import MostTimeRanking from '@/components/ranking/MostTimeRanking.vue'
import PlayerSearch from '@/components/common/PlayerSearch.vue'

const ranking = useRankingStore()
const settings = useSettingsStore()
const season = useSeasonStore()
const activeTab = ref('contribution')
const tabs = [
  { key: 'contribution', label: '기여도 순위', icon: '🤝' },
  { key: 'bestplayer', label: '베스트 플레이어', icon: '🔫' },
  { key: 'mosttime', label: '최장 플레이어', icon: '⏱️' },
]

onMounted(async () => {
  await Promise.all([settings.fetch(), season.fetchSeasons()])
  await ranking.fetchAll(season.selectedSeasonId)
})

// 시즌 변경 시 랭킹 다시 로드
watch(() => season.selectedSeasonId, (id) => ranking.fetchAll(id))

function onSeasonChange(id) { season.selectSeason(id) }
</script>
<style scoped>
.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity .2s ease, transform .2s ease }
.tab-fade-enter-from { opacity: 0; transform: translateY(8px) }
.tab-fade-leave-to { opacity: 0; transform: translateY(-4px) }
</style>

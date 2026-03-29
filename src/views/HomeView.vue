<template>
  <div class="animate-fade-in space-y-6">
    <!-- 배그 ID 검색 바 -->
    <div class="card p-4">
      <div class="text-xs text-clan-muted font-mono tracking-wider mb-3">🔍 배그 ID로 클랜원 검색</div>
      <PlayerSearch :key="searchKey" />
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
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import { useSettingsStore } from '@/stores/settings'
import { useSeasonStore } from '@/stores/season'
import ContributionRanking from '@/components/ranking/ContributionRanking.vue'
import BestPlayerRanking from '@/components/ranking/BestPlayerRanking.vue'
import MostTimeRanking from '@/components/ranking/MostTimeRanking.vue'
import PlayerSearch from '@/components/common/PlayerSearch.vue'

defineOptions({ name: 'HomeView' })

const ranking = useRankingStore()
const settings = useSettingsStore()
const season = useSeasonStore()
const activeTab = ref('contribution')
const searchKey = ref(0) // PlayerSearch 강제 리셋용

const tabs = [
  { key: 'contribution', label: '기여도 순위', icon: '🤝' },
  { key: 'bestplayer',   label: '베스트 플레이어', icon: '🔫' },
  { key: 'mosttime',     label: '최장 플레이어', icon: '⏱️' },
]

async function loadData() {
  await Promise.all([settings.fetch(), season.fetchSeasons()])
  await ranking.fetchAll(season.selectedSeasonId)
}

onMounted(loadData)

// 관리자→메인 재진입 시 데이터 새로고침 + PlayerSearch 상태 리셋
onActivated(() => {
  searchKey.value++ // PlayerSearch 컴포넌트 강제 재생성 (모달 상태 초기화)
  loadData()
})

watch(() => season.selectedSeasonId, (id) => ranking.fetchAll(id))
function onSeasonChange(id) { season.selectSeason(id) }
</script>

<style scoped>
.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity .2s ease, transform .2s ease }
.tab-fade-enter-from { opacity: 0; transform: translateY(8px) }
.tab-fade-leave-to { opacity: 0; transform: translateY(-4px) }
</style>
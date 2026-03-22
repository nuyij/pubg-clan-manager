<template>
  <div class="animate-fade-in space-y-8">
    <!-- 헤더 -->
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-lg bg-clan-gold/20 border border-clan-gold/30 flex items-center justify-center">
        <svg class="w-6 h-6 text-clan-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <div>
        <h1 class="font-display text-2xl font-bold tracking-widest">관리자 패널</h1>
        <p class="text-clan-muted text-sm">
          <span :class="auth.isMaster ? 'text-yellow-400' : 'text-blue-400'">
            {{ auth.isMaster ? '👑 마스터' : '⚙️ 관리자' }}
          </span>
          로 로그인됨
        </p>
      </div>
      <RouterLink to="/" class="ml-auto btn-outline flex items-center gap-2 text-sm">← 메인</RouterLink>
    </div>

    <!-- 접근 거부 -->
    <div v-if="!auth.isAdmin" class="text-center py-20">
      <div class="text-5xl mb-4">🔒</div>
      <p class="font-display text-xl text-red-400 tracking-wider">접근 권한이 없습니다</p>
    </div>

    <template v-else>
      <!-- 모바일 탭 -->
      <div class="flex gap-1 sm:hidden overflow-x-auto pb-1 -mx-4 px-4">
        <button v-for="s in visibleSections" :key="s.key"
          :class="['px-3 py-2 text-xs font-mono rounded whitespace-nowrap transition-colors shrink-0',
            activeSection===s.key ? 'bg-clan-gold text-black font-bold' : 'bg-clan-surface text-clan-muted']"
          @click="activeSection=s.key">
          {{ s.icon }} {{ s.label }}
        </button>
      </div>

      <!-- 데스크탑: 전체 / 모바일: 선택 -->
      <div class="space-y-8">
        <template v-for="s in visibleSections" :key="s.key">
          <component :is="s.component" v-if="!isMobile || activeSection===s.key" />
        </template>
      </div>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, markRaw } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useRankingStore } from '@/stores/ranking'
import { useSeasonStore } from '@/stores/season'
import ScoreConfig from '@/components/admin/ScoreConfig.vue'
import DataSync from '@/components/admin/DataSync.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import LuckyDraw from '@/components/admin/LuckyDraw.vue'
import SeasonManager from '@/components/admin/SeasonManager.vue'
import ClanSettings from '@/components/admin/ClanSettings.vue'

const auth = useAuthStore()
const settings = useSettingsStore()
const ranking = useRankingStore()
const season = useSeasonStore()
const activeSection = ref('sync')
const isMobile = ref(window.innerWidth < 640)

// 마스터만 볼 수 있는 섹션 포함
const allSections = [
  { key: 'sync',   label: '데이터 동기화', icon: '🔄', component: markRaw(DataSync),       masterOnly: false },
  { key: 'score',  label: '점수 설정',     icon: '📐', component: markRaw(ScoreConfig),    masterOnly: false },
  { key: 'season', label: '시즌 관리',     icon: '🏆', component: markRaw(SeasonManager),  masterOnly: false },
  { key: 'users',  label: '유저 관리',     icon: '👥', component: markRaw(UserManagement), masterOnly: false },
  { key: 'draw',   label: '럭키드로우',    icon: '🎲', component: markRaw(LuckyDraw),      masterOnly: false },
  { key: 'clan',   label: '클랜 설정',     icon: '🛡️', component: markRaw(ClanSettings),  masterOnly: true  },
]

const visibleSections = computed(() =>
  allSections.filter(s => !s.masterOnly || auth.isMaster)
)

onMounted(async () => {
  window.addEventListener('resize', () => isMobile.value = window.innerWidth < 640)
  await Promise.all([settings.fetch(), ranking.fetchAll(), season.fetchSeasons()])
})
</script>

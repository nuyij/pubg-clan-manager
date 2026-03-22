<template>
  <nav class="bg-clan-card border-b border-clan-border sticky top-0 z-40">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

      <!-- 로고 & 클랜명 -->
      <RouterLink to="/" class="flex items-center gap-3 min-w-0 shrink-0">
        <div class="w-10 h-10 rounded bg-clan-gold flex items-center justify-center overflow-hidden shrink-0">
          <img v-if="settings.settings.clan_logo_url" :src="settings.settings.clan_logo_url" class="w-full h-full object-contain" />
          <span v-else class="text-black font-display font-bold text-lg">{{ (settings.settings.clan_name || 'C')[0] }}</span>
        </div>
        <div class="min-w-0">
          <div class="font-display font-bold text-base text-clan-gold tracking-widest leading-none truncate">
            {{ settings.settings.clan_name || 'MY CLAN' }}
          </div>
          <div class="font-mono text-[10px] text-clan-muted tracking-wider hidden sm:block">PUBG CLAN SYSTEM</div>
        </div>
      </RouterLink>

      <!-- 시즌 선택 -->
      <select
        v-if="season.seasons.length > 1"
        :value="season.selectedSeasonId"
        @change="season.selectSeason($event.target.value)"
        class="hidden sm:block bg-clan-surface border border-clan-border rounded px-2 py-1 text-xs font-mono text-clan-muted focus:border-clan-gold focus:outline-none"
      >
        <option v-for="s in season.seasons" :key="s.id" :value="s.id">
          {{ s.name }}{{ s.is_active ? ' (현재)' : '' }}
        </option>
      </select>

      <!-- 우측 -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- 관리자 버튼 -->
        <RouterLink v-if="auth.isAdmin" to="/admin" class="btn-gold flex items-center gap-1.5 text-xs px-3 py-2">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <span class="hidden sm:inline">{{ auth.isMaster ? '마스터' : '관리자' }}</span>
        </RouterLink>

        <!-- 로그인 상태 -->
        <div v-if="auth.isLoggedIn" class="flex items-center gap-2">
          <button @click="showProfile = true" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img v-if="auth.discordAvatar" :src="auth.discordAvatar" class="w-8 h-8 rounded-full border border-clan-border" />
            <div class="hidden sm:block text-left">
              <div class="text-xs text-clan-text font-body leading-none">
                {{ auth.member?.clan_nickname || '닉네임 미설정' }}
              </div>
              <div class="text-[10px] text-clan-muted font-mono">{{ auth.discordName }}</div>
            </div>
          </button>
          <button @click="auth.logout" class="btn-outline text-xs px-3 py-2">로그아웃</button>
        </div>

        <!-- 로그인 버튼 -->
        <button v-else @click="auth.loginWithDiscord" class="btn-gold flex items-center gap-2 text-xs px-3 py-2">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055A19.9 19.9 0 0 0 6.1 21.83a.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.768.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Discord 로그인
        </button>
      </div>
    </div>

    <!-- 닉네임 미설정 경고 -->
    <div v-if="auth.needsNickname" class="bg-yellow-900/40 border-t border-yellow-700/40 px-4 py-2 text-center text-xs text-yellow-300">
      ⚠️ 클랜 닉네임을 설정해주세요.
      <button @click="showProfile = true" class="underline ml-1 font-bold">지금 설정하기</button>
    </div>
  </nav>

  <!-- 프로필 모달 -->
  <ProfileModal :show="showProfile" @close="showProfile = false" />
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useSeasonStore } from '@/stores/season'
import ProfileModal from '@/components/common/ProfileModal.vue'

const auth = useAuthStore()
const settings = useSettingsStore()
const season = useSeasonStore()
const showProfile = ref(false)
</script>

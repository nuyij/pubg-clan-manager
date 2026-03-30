<template>
  <div class="min-h-screen bg-clan-bg font-body">
    <div v-if="auth.loading" class="fixed inset-0 bg-clan-bg flex items-center justify-center z-50">
      <div class="text-clan-gold font-display text-2xl font-bold tracking-widest animate-pulse">LOADING...</div>
    </div>
    <template v-else>
      <NavBar />

      <!-- 비로그인 / 미가입 / 승인 대기 → 로그인/안내 화면만 표시 -->
      <div v-if="!auth.isLoggedIn || auth.isUnregistered || auth.isPending"
        class="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <div class="text-6xl">
          {{ !auth.isLoggedIn ? '🎮' : auth.isPending ? '⏳' : '👋' }}
        </div>
        <div class="font-display text-2xl font-bold text-clan-gold tracking-widest">
          {{ !auth.isLoggedIn ? 'PUBG 클랜 사이트' : auth.isPending ? '승인 대기 중' : '가입 신청 필요' }}
        </div>
        <div class="text-clan-muted text-sm leading-relaxed">
          <template v-if="!auth.isLoggedIn">
            클랜원 전용 사이트입니다.<br>
            Discord 계정으로 로그인해주세요.
          </template>
          <template v-else-if="auth.isPending">
            가입 신청이 접수되었습니다.<br>
            관리자 승인 후 이용 가능합니다.<br>
            <span class="text-xs font-mono">문의: 클랜 Discord 채널</span>
          </template>
          <template v-else>
            클랜 사이트를 이용하려면 가입 신청이 필요합니다.<br>
            상단의 <span class="text-blue-400 font-bold">가입 신청하기</span> 버튼을 눌러주세요.
          </template>
        </div>
        <button v-if="!auth.isLoggedIn" @click="auth.loginWithDiscord"
          class="btn-gold flex items-center gap-2 text-sm px-6 py-3 mx-auto">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055A19.9 19.9 0 0 0 6.1 21.83a.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.768.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          Discord 로그인
        </button>
      </div>

      <!-- 정식 멤버만 접근 가능 -->
      <template v-else>
        <LuckyDrawBanner />
        <main class="max-w-6xl mx-auto px-4 py-8">
          <RouterView v-slot="{ Component }">
            <KeepAlive :include="['HomeView']">
              <component :is="Component" />
            </KeepAlive>
          </RouterView>
        </main>
      </template>
    </template>
  </div>
</template>
<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/common/NavBar.vue'
import LuckyDrawBanner from '@/components/common/LuckyDrawBanner.vue'
import { initVisibilityPing } from '@/lib/supabase'
const auth = useAuthStore()
onMounted(() => {
  auth.init()
  initVisibilityPing()
})
</script>
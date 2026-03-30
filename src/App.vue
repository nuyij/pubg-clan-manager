<template>
  <div class="min-h-screen bg-clan-bg font-body">
    <div v-if="auth.loading" class="fixed inset-0 bg-clan-bg flex items-center justify-center z-50">
      <div class="text-clan-gold font-display text-2xl font-bold tracking-widest animate-pulse">LOADING...</div>
    </div>
    <template v-else>
      <NavBar />
      <LuckyDrawBanner />
      <main class="max-w-6xl mx-auto px-4 py-8">
        <RouterView v-slot="{ Component }">
          <KeepAlive :include="['HomeView']">
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </main>
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

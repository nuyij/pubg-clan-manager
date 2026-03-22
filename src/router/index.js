import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AdminView from '@/views/AdminView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAdmin: true } }
  ]
})

router.beforeEach((to) => {
  if (to.meta.requiresAdmin) {
    const auth = useAuthStore()
    if (!auth.isAdmin) return { name: 'home' }
  }
})

export default router

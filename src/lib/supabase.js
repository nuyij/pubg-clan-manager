import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// 탭 복귀 시 무조건 새로고침 (Supabase 연결 먹통 해결)
export function initVisibilityPing() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      location.reload()
    }
  })
}

// 하위 호환용 더미 exports
export function startKeepAlive() {}
export function stopKeepAlive() {}
export function onPageVisible() {}
export async function queryWithRetry(queryFn) {
  return await queryFn()
}

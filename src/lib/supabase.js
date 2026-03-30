import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

<<<<<<< HEAD
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
=======
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ── Keepalive (30초마다 연결 유지) ─────────────────────
let _pingInterval = null
export function startKeepAlive() {
  if (_pingInterval) return
  _pingInterval = setInterval(async () => {
    try { await supabase.from('settings').select('id').limit(1).maybeSingle() } catch {}
  }, 30 * 1000)
}
export function stopKeepAlive() {
  if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null }
}

// ── 탭 복귀 시 콜백 ────────────────────────────────────
const _callbacks = []
export function onPageVisible(cb) {
  if (!_callbacks.includes(cb)) _callbacks.push(cb)
}

export function initVisibilityPing() {
  let hiddenAt = null
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
    } else if (document.visibilityState === 'visible' && hiddenAt) {
      hiddenAt = null
      for (const cb of _callbacks) {
        try { await cb() } catch {}
      }
    }
  })
}

// ── queryWithRetry ─────────────────────────────────────
export async function queryWithRetry(queryFn, retries = 2, label = '') {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await queryFn()
      if (!result.error) return result
      if (i < retries) await new Promise(r => setTimeout(r, 600 * (i + 1)))
    } catch (e) {
      if (i < retries) await new Promise(r => setTimeout(r, 600 * (i + 1)))
      else return { data: null, error: e }
    }
  }
  return { data: null, error: new Error('최대 재시도 초과') }
}
>>>>>>> parent of df5c86f ( Supabase JS 클라이언트가 내부적으로 fetch를 wrapping하는 과정에서 탭 전환 후 문제가 생기는 걸, 브라우저 기본 fetch를 직접 넘겨줘서 우회하는 방식)

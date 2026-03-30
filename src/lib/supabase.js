import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

<<<<<<< HEAD
<<<<<<< HEAD
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
=======
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
=======
function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// 클라이언트 인스턴스 (재생성 가능하도록 래퍼로 관리)
let _client = createSupabaseClient()

// 항상 현재 클라이언트를 반환하는 프록시
export const supabase = new Proxy({}, {
  get(_, prop) {
    return _client[prop]
  }
>>>>>>> parent of 2010495 (Proxy 없이 가장 단순한 구조)
})

// 클라이언트 강제 재생성 (연결 블로킹 상태 해제용)
async function resetClient() {
  console.log('[Supabase] 클라이언트 재생성')
  try {
    // 기존 세션 정보 유지
    const { data: { session } } = await _client.auth.getSession()
    _client = createSupabaseClient()
    // 세션 복원
    if (session) {
      await _client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    }
    console.log('[Supabase] 재생성 완료, 세션:', !!session)
  } catch (e) {
    console.warn('[Supabase] 재생성 중 오류:', e.message)
    _client = createSupabaseClient()
  }
}

// ── 탭 복귀 감지 ───────────────────────────────────────
export function initVisibilityPing() {
  let hiddenAt = null

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }

    if (document.visibilityState !== 'visible' || !hiddenAt) return
    const away = Date.now() - hiddenAt
    hiddenAt = null
    console.log(`[Visibility] 복귀 (자리비움 ${Math.floor(away/1000)}초)`)

    // 30초 이상 자리비움이면 클라이언트 재생성으로 블로킹 해제
    if (away > 30 * 1000) {
      await resetClient()
    }

    // 재로드 콜백 실행
    for (const cb of _callbacks) {
      try { await cb() } catch (e) { console.warn('[Visibility] 콜백 오류:', e.message) }
    }
  })
}

// ── 재로드 콜백 등록 ───────────────────────────────────
const _callbacks = []
export function onPageVisible(cb) {
  if (!_callbacks.includes(cb)) _callbacks.push(cb)
}

// ── Keepalive ──────────────────────────────────────────
let _pingInterval = null
export function startKeepAlive() {
  if (_pingInterval) return
  _pingInterval = setInterval(async () => {
    try { await _client.from('settings').select('id').limit(1).maybeSingle() } catch {}
  }, 30 * 1000)
}
export function stopKeepAlive() {
  if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null }
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

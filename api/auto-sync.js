// Vercel Serverless Function - 6시간마다 auto-sync Edge Function 호출
export default async function handler(req, res) {
  // Vercel Cron은 Authorization 헤더로 보안 처리
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/auto-sync`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }
    )

    const data = await response.json()
    console.log('[Cron] auto-sync 결과:', data)
    return res.status(200).json({ success: true, result: data })
  } catch (e) {
    console.error('[Cron] auto-sync 실패:', e.message)
    return res.status(500).json({ success: false, error: e.message })
  }
}
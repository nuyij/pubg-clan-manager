import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PUBG_API_KEY = Deno.env.get('PUBG_API_KEY') ?? ''
const PUBG_BASE = 'https://api.pubg.com/shards/steam'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!PUBG_API_KEY) {
      return new Response(JSON.stringify({ error: 'PUBG_API_KEY가 설정되지 않았습니다' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    const url = new URL(req.url)
    const path = url.searchParams.get('path')
    if (!path) {
      return new Response(JSON.stringify({ error: 'path 파라미터 누락' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    const pubgRes = await fetch(`${PUBG_BASE}${path}`, {
      headers: {
        'Authorization': `Bearer ${PUBG_API_KEY}`,
        'Accept': 'application/vnd.api+json',
      },
    })

    const data = await pubgRes.json()
    return new Response(JSON.stringify(data), {
      status: pubgRes.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})

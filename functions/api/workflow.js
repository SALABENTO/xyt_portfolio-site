// EdgeOne Function: proxy Coze workflow API calls
// POST /api/workflow  body: { shuiyin?, zhuti? } (both optional)
// Returns SSE stream from Coze workflow API

export async function onRequestPost({ request, env }) {
  const COZE_TOKEN = env.COZE_TOKEN || 'pat_ervvPIQOKDLONWWa9LLUGqFHg57vY2dBnlyIbez5T3QwW8V9qkxuIJIUeplwfhPl'
  const COZE_API = env.COZE_API || 'https://api.coze.cn/v1/workflow/stream_run'
  const COZE_WORKFLOW_ID = env.COZE_WORKFLOW_ID || '7664202655792054308'

  if (!COZE_TOKEN) {
    return new Response(JSON.stringify({ error: 'Server not configured: missing COZE_TOKEN' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body = {}
  try {
    body = await request.json().catch(() => ({}))
  } catch { /* use empty body */ }

  const { shuiyin, zhuti } = body

  // Build parameters — default nicheng if not provided
  const parameters = { nicheng: shuiyin || '万物指南' }
  if (zhuti) parameters.zhuti = zhuti

  try {
    const cozeRes = await fetch(COZE_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${COZE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: COZE_WORKFLOW_ID,
        parameters,
      }),
    })

    if (!cozeRes.ok) {
      const errText = await cozeRes.text().catch(() => '')
      return new Response(JSON.stringify({ error: `Coze API error ${cozeRes.status}: ${errText.slice(0, 300)}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(cozeRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: `Fetch failed: ${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

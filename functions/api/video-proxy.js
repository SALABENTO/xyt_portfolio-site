// EdgeOne Function: transparent video proxy
// GET /api/video-proxy?url=<encoded_video_url>
// Coze CDN URLs are pre-signed (self-authenticating), so we just forward

export async function onRequestGet({ request }) {
  const url = new URL(request.url)
  const videoUrl = url.searchParams.get('url')

  if (!videoUrl) {
    return new Response('Missing ?url= parameter', { status: 400 })
  }

  try {
    // Signed URLs are self-authenticating — no Bearer token needed
    const headers = new Headers()
    const range = request.headers.get('Range')
    if (range) headers.set('Range', range)

    const res = await fetch(videoUrl, { headers })

    if (!res.ok) {
      return new Response(`Upstream error: ${res.status}`, { status: 502 })
    }

    const respHeaders = new Headers()
    const ct = res.headers.get('Content-Type')
    if (ct) respHeaders.set('Content-Type', ct)
    const cl = res.headers.get('Content-Length')
    if (cl) respHeaders.set('Content-Length', cl)
    const cr = res.headers.get('Content-Range')
    if (cr) respHeaders.set('Content-Range', cr)
    respHeaders.set('Accept-Ranges', 'bytes')
    respHeaders.set('Cache-Control', 'public, max-age=3600')

    const status = range && res.status === 206 ? 206 : res.status

    return new Response(res.body, { status, headers: respHeaders })
  } catch (err) {
    return new Response(`Fetch failed: ${err.message}`, { status: 502 })
  }
}

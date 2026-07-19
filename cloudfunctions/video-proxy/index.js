// CloudBase cloud function: transparent video proxy
// Proxies Coze CDN signed URLs for same-origin video playback
// Supports Range requests for video seeking
exports.main = async function (event, context) {
  const videoUrl = event.url || event.queryStringParameters?.url || ''

  if (!videoUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Missing ?url= parameter',
    }
  }

  try {
    const headers = {}
    // CloudBase HTTP trigger passes headers in different formats
    const range = event.headers?.range || event.headers?.Range || event.Range || ''
    if (range) headers.Range = range

    const res = await fetch(videoUrl, { headers })

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'text/plain' },
        body: `Upstream error: ${res.status}`,
      }
    }

    const buf = await res.arrayBuffer()
    const body = Buffer.from(buf).toString('base64')

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'video/mp4',
        'Content-Length': String(buf.byteLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
      body,
      isBase64Encoded: true,
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'text/plain' },
      body: `Fetch failed: ${err.message}`,
    }
  }
}

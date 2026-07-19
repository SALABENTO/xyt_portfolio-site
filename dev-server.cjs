// Local dev server: implements /api/workflow and /api/video-proxy
// Used by Vite proxy during local development
// Usage: node dev-server.js
// Reads COZE_TOKEN and COZE_WORKFLOW_ID from .env file

const http = require('http')
const https = require('https')
const { parse } = require('url')

// Load .env manually (no dotenv dependency needed)
const fs = require('fs')
const path = require('path')
function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  const env = {}
  try {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      env[key] = val
    }
  } catch { /* .env file optional */ }
  return env
}

const env = loadEnv()
const PORT = 8787
const COZE_TOKEN = env.COZE_TOKEN || ''
const COZE_API = env.COZE_API || 'https://api.coze.cn/v1/workflow/stream_run'
const COZE_WORKFLOW_ID = env.COZE_WORKFLOW_ID || '7664202655792054308'

function proxyRequest(url, options) {
  const client = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    const req = client.request(url, options, (res) => {
      resolve(res)
    })
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true)
  const method = req.method.toUpperCase()

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  // POST /api/workflow
  if (parsedUrl.pathname === '/api/workflow' && method === 'POST') {
    let bodyJson = ''
    req.on('data', chunk => bodyJson += chunk)
    req.on('end', async () => {
      let body = {}
      try { body = JSON.parse(bodyJson) } catch { /* empty */ }

      const { shuiyin, zhuti } = body
      const parameters = { nicheng: shuiyin || '万物指南' }
      if (zhuti) parameters.zhuti = zhuti

      try {
        const cozeRes = await proxyRequest(COZE_API, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${COZE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workflow_id: COZE_WORKFLOW_ID, parameters }),
        })

        res.writeHead(cozeRes.statusCode, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        cozeRes.pipe(res)
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `Fetch failed: ${err.message}` }))
      }
    })
    return
  }

  // GET /api/video-proxy?url=...
  if (parsedUrl.pathname === '/api/video-proxy' && method === 'GET') {
    const videoUrl = parsedUrl.query.url
    if (!videoUrl) { res.writeHead(400); res.end('Missing ?url= parameter'); return }

    try {
      // Signed URLs from Coze CDN are self-authenticating — don't add Bearer
      const proxyHeaders = {}
      const range = req.headers['range']
      if (range) proxyHeaders.Range = range

      const cozeRes = await proxyRequest(videoUrl, {
        method: 'GET',
        headers: proxyHeaders,
      })

      res.writeHead(cozeRes.statusCode, {
        'Content-Type': cozeRes.headers['content-type'] || 'video/mp4',
        'Content-Length': cozeRes.headers['content-length'] || '',
        'Content-Range': cozeRes.headers['content-range'] || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      })
      cozeRes.pipe(res)
    } catch (err) {
      res.writeHead(502)
      res.end(`Fetch failed: ${err.message}`)
    }
    return
  }

  // 404
  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`[dev-server] listening on http://localhost:${PORT}`)
  console.log(`[dev-server] workflow: POST /api/workflow`)
  console.log(`[dev-server] video proxy: GET /api/video-proxy?url=...`)
})

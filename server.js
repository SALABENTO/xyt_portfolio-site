// Production server for Zeabur / any Node.js PaaS
// Serves static frontend + API proxy for Coze workflow & video

import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, 'dist')

const COZE_TOKEN = process.env.COZE_TOKEN || ''
const COZE_API = process.env.COZE_API || 'https://api.coze.cn/v1/workflow/stream_run'
const COZE_WORKFLOW_ID = process.env.COZE_WORKFLOW_ID || '7664202655792054308'

const PORT = process.env.PORT || 8080

// MIME types for static files
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
}

function serveStatic(res, pathname) {
  let filePath = join(DIST, pathname === '/' ? 'index.html' : pathname)
  if (!existsSync(filePath)) {
    // SPA fallback
    filePath = join(DIST, 'index.html')
  }
  try {
    const data = readFileSync(filePath)
    const ext = extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}

function proxyResponse(res, upstreamRes) {
  res.writeHead(upstreamRes.statusCode, Object.fromEntries(upstreamRes.headers))
  upstreamRes.pipe(res)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const method = req.method.toUpperCase()

  // API routes
  if (url.pathname === '/api/workflow' && method === 'POST') {
    if (!COZE_TOKEN) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'COZE_TOKEN not configured' }))
      return
    }

    let body = ''
    req.on('data', c => body += c)
    req.on('end', async () => {
      let params = {}
      try { const b = JSON.parse(body); params = b } catch { /* use defaults */ }
      const parameters = { nicheng: params.shuinyin || '万物指南' }
      if (params.zhuti) parameters.zhuti = params.zhuti

      try {
        const cozeRes = await fetch(COZE_API, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${COZE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workflow_id: COZE_WORKFLOW_ID, parameters }),
        })
        if (!cozeRes.ok) {
          const errText = await cozeRes.text().catch(() => '')
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `Coze error ${cozeRes.status}: ${errText.slice(0, 300)}` }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
        cozeRes.body.pipe(res)
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  if (url.pathname === '/api/video-proxy' && method === 'GET') {
    const videoUrl = url.searchParams.get('url')
    if (!videoUrl) { res.writeHead(400); res.end('Missing ?url='); return }
    try {
      const cozeRes = await fetch(videoUrl)
      proxyResponse(res, cozeRes)
    } catch (err) {
      res.writeHead(502)
      res.end(`Fetch failed: ${err.message}`)
    }
    return
  }

  // Static files
  serveStatic(res, url.pathname)
})

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

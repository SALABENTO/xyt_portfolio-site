// CloudBase cloud function: proxy Coze workflow call
// Called via SDK app.callFunction() — returns plain object (not HTTP format)
// Timeout: 600s, Coze workflow takes 3-5 min
const COZE_TOKEN = process.env.COZE_TOKEN || ''
const COZE_API = process.env.COZE_API || 'https://api.coze.cn/v1/workflow/stream_run'
const COZE_WORKFLOW_ID = process.env.COZE_WORKFLOW_ID || '7664202655792054308'

function extractVideoUrl(text) {
  const mdMatch = text.match(/[!]?\[.*?\]\((https?:\/\/[^\s)"'<>]+)\)/)
  if (mdMatch) return mdMatch[1]

  const extPatterns = [
    /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i,
    /https?:\/\/[^\s"'<>]+\.mov[^\s"'<>]*/i,
    /https?:\/\/[^\s"'<>]+\.(?:webm|avi|mkv|m4v)[^\s"'<>]*/i,
  ]
  for (const p of extPatterns) {
    const m = text.match(p)
    if (m) return m[0]
  }

  const cdnPatterns = [
    /https?:\/\/[^\s"'<>]*?(?:video|output|result|cdn|cos|oss)[^\s"'<>]*/i,
    /https?:\/\/[^\s"'<>]*?coze[^\s"'<>]*/i,
    /https?:\/\/[^\s"'<>]*?byte(?:dance|img|cdn)[^\s"'<>]*/i,
  ]
  for (const p of cdnPatterns) {
    const m = text.match(p)
    if (m) return m[0]
  }

  const urlMatch = text.match(/(https?:\/\/[^\s"'<>]{10,})/)
  if (urlMatch) return urlMatch[1]

  return null
}

exports.main = async function (event, context) {
  const { shuiyin, zhuti } = event

  if (!COZE_TOKEN) {
    return { error: 'COZE_TOKEN not configured' }
  }

  const parameters = { nicheng: shuiyin || '万物指南' }
  if (zhuti) parameters.zhuti = zhuti

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
      return { error: `Coze error ${cozeRes.status}: ${errText.slice(0, 300)}` }
    }

    // Read full SSE stream
    const text = await cozeRes.text()
    let foundUrl = ''
    let fullContent = ''

    // Parse SSE to extract content and video URL
    const parts = text.split(/\n\n/)
    for (const part of parts) {
      if (!part.trim()) continue

      const dataLines = []
      let eventType = ''
      for (const line of part.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:')) dataLines.push(trimmed.slice(5).trim())
        else if (trimmed.startsWith('event:')) eventType = trimmed.slice(6).trim()
      }

      if (eventType === 'Error' || eventType === 'error') {
        for (const dataStr of dataLines) {
          try {
            const err = JSON.parse(dataStr)
            return { error: err.error_message || err.message || dataStr }
          } catch { /* ignore parse errors */ }
        }
        continue
      }

      for (const dataStr of dataLines) {
        if (dataStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(dataStr)
          const content = parsed.content || parsed.output || parsed.text || parsed.answer || ''
          if (typeof content === 'string') fullContent += content

          const url = parsed.url || parsed.video_url || parsed.videoUrl || parsed.file_url || parsed.fileUrl || ''
          if (url) { foundUrl = url; break }

          if (parsed.output) {
            if (typeof parsed.output === 'string') {
              const outUrl = extractVideoUrl(parsed.output)
              if (outUrl) { foundUrl = outUrl; break }
            } else if (typeof parsed.output === 'object') {
              const outUrl = parsed.output.url || parsed.output.video_url || ''
              if (outUrl) { foundUrl = outUrl; break }
            }
          }

          const attachments = parsed.attachments || parsed.files || []
          if (Array.isArray(attachments)) {
            for (const att of attachments) {
              const attUrl = att.url || att.file_url || att.download_url || ''
              if (attUrl) { foundUrl = attUrl; break }
            }
            if (foundUrl) break
          }

          if (parsed.data && typeof parsed.data === 'object') {
            const dataUrl = parsed.data.url || parsed.data.video_url || ''
            if (dataUrl) { foundUrl = dataUrl; break }
          }
        } catch {
          const urlFromStr = extractVideoUrl(dataStr)
          if (urlFromStr) { foundUrl = urlFromStr; break }
        }
      }

      if (foundUrl) break
    }

    if (!foundUrl && fullContent) {
      foundUrl = extractVideoUrl(fullContent) || ''
    }

    return {
      videoUrl: foundUrl || '',
      content: fullContent.slice(0, 500),
    }
  } catch (err) {
    return { error: err.message }
  }
}

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, AlertCircle, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { FadeIn } from './animations/FadeIn'

// Coze API credentials — used directly from frontend (personal portfolio site)
const COZE_API = 'https://api.coze.cn/v1/workflow/stream_run'
const COZE_WORKFLOW_ID = '7664202655792054308'
const COZE_TOKEN = 'pat_ervvPIQOKDLONWWa9LLUGqFHg57vY2dBnlyIbez5T3QwW8V9qkxuIJIUeplwfhPl'

// Local dev uses /api/workflow proxy; production calls Coze directly
const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')

interface CozeWorkflowProps {
  onGenerationStart: () => void
  onGenerationStop: () => void
  onGenerationDone: (videoUrl: string) => void
}

function extractVideoUrl(text: string): string | null {
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

interface StreamEvent {
  ts: number
  type: 'raw' | 'parsed' | 'url'
  content: string
}

export function CozeWorkflow({ onGenerationStart, onGenerationStop, onGenerationDone }: CozeWorkflowProps) {
  const [shuiyin, setShuiyin] = useState('万物指南')
  const [zhuti, setZhuti] = useState('')
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [proxyFailed, setProxyFailed] = useState(false)
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [showLog, setShowLog] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const runWorkflow = useCallback(async () => {

    setPhase('running')
    setErrorMsg('')
    setVideoUrl('')
    setProxyFailed(false)
    setEvents([])
    setShowLog(true)

    const addEvent = (type: StreamEvent['type'], content: string) => {
      setEvents(prev => [...prev, { ts: Date.now(), type, content }])
    }

    try {
      abortRef.current = new AbortController()
      onGenerationStart()

      if (isProduction) {
        // Production: call Coze API directly, parse SSE stream
        addEvent('raw', '直接调用 Coze API...')
        const res = await fetch(COZE_API, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${COZE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_id: COZE_WORKFLOW_ID,
            parameters: { nicheng: shuiyin || '万物指南', ...(zhuti ? { zhuti } : {}) },
          }),
          signal: abortRef.current.signal,
        })

        addEvent('raw', `响应状态: ${res.status} ${res.statusText}`)

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          throw new Error(`Coze HTTP ${res.status}: ${errText.slice(0, 300)}`)
        }

        // SSE parsing — same as local dev
        const reader = res.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')

        const decoder = new TextDecoder()
        let fullContent = ''
        let sseBuffer = ''
        let foundUrl = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) { addEvent('raw', '-- 流结束 --'); break }

          const chunk = decoder.decode(value, { stream: true })
          sseBuffer += chunk

          const parts = sseBuffer.split(/\n\n/)
          sseBuffer = parts.pop() || ''

          for (const part of parts) {
            if (!part.trim()) continue
            addEvent('raw', part.trim().slice(0, 300))

            const dataLines: string[] = []
            let eventType = ''
            for (const line of part.split('\n')) {
              const trimmed = line.trim()
              if (trimmed.startsWith('data:')) dataLines.push(trimmed.slice(5).trim())
              else if (trimmed.startsWith('event:')) eventType = trimmed.slice(6).trim()
            }

            if (dataLines.length === 0) continue

            if (eventType === 'Error' || eventType === 'error') {
              for (const dataStr of dataLines) {
                try {
                  const err = JSON.parse(dataStr)
                  const msg = err.error_message || err.message || dataStr
                  throw new Error(`Coze 错误: ${msg}`)
                } catch (e) {
                  if (e instanceof Error && e.message.startsWith('Coze 错误:')) throw e
                }
              }
              continue
            }

            for (const dataStr of dataLines) {
              if (dataStr === '[DONE]') { addEvent('parsed', '[DONE]'); continue }

              try {
                const parsed = JSON.parse(dataStr)
                addEvent('parsed', JSON.stringify(parsed).slice(0, 300))

                const content = parsed.content || parsed.output || parsed.text || parsed.answer || ''
                if (typeof content === 'string') fullContent += content

                const url = parsed.url || parsed.video_url || parsed.videoUrl || parsed.file_url || parsed.fileUrl || ''
                if (url) { foundUrl = url; addEvent('url', `发现视频链接: ${url}`); break }

                if (parsed.output) {
                  if (typeof parsed.output === 'string') {
                    const outUrl = extractVideoUrl(parsed.output)
                    if (outUrl) { foundUrl = outUrl; addEvent('url', `从output文本发现: ${outUrl}`); break }
                  } else if (typeof parsed.output === 'object') {
                    const outUrl = parsed.output.url || parsed.output.video_url || parsed.output.file_url || ''
                    if (outUrl) { foundUrl = outUrl; addEvent('url', `从output对象发现: ${outUrl}`); break }
                  }
                }

                const attachments = parsed.attachments || parsed.files || []
                if (Array.isArray(attachments)) {
                  for (const att of attachments) {
                    const attUrl = att.url || att.file_url || att.download_url || ''
                    if (attUrl) { foundUrl = attUrl; addEvent('url', `从附件发现: ${attUrl}`); break }
                  }
                  if (foundUrl) break
                }

                if (parsed.data && typeof parsed.data === 'object') {
                  const dataUrl = parsed.data.url || parsed.data.video_url || parsed.data.file_url || ''
                  if (dataUrl) { foundUrl = dataUrl; addEvent('url', `从data对象发现: ${dataUrl}`); break }
                }

                if (parsed.message && typeof parsed.message === 'object') {
                  if (parsed.message.content) fullContent += String(parsed.message.content)
                }
              } catch {
                const urlFromStr = extractVideoUrl(dataStr)
                if (urlFromStr) { foundUrl = urlFromStr; addEvent('url', `发现视频链接: ${urlFromStr}`); break }
              }
            }

            if (foundUrl) break
          }

          if (!foundUrl) {
            const urlFromContent = extractVideoUrl(fullContent)
            if (urlFromContent) { foundUrl = urlFromContent; addEvent('url', `从内容中发现: ${urlFromContent}`) }
          }

          if (foundUrl) break
        }

        if (!foundUrl && fullContent) {
          foundUrl = extractVideoUrl(fullContent) || ''
        }

        if (foundUrl) {
          setVideoUrl(foundUrl)
          setPhase('done')
          addEvent('url', `最终视频链接: ${foundUrl}`)
          onGenerationDone(foundUrl)
          setShowLog(false)
        } else {
          setPhase('done')
          addEvent('raw', `完整响应: ${fullContent.slice(0, 1000)}`)
        }
      } else {
        // Local dev: SSE streaming via /api/workflow proxy
        const res = await fetch('/api/workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shuiyin, zhuti }),
          signal: abortRef.current.signal,
        })

        addEvent('raw', `响应状态: ${res.status} ${res.statusText}`)

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: res.statusText }))
          throw new Error(errBody.error || `HTTP ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')

        const decoder = new TextDecoder()
        let fullContent = ''
        let sseBuffer = ''
        let foundUrl = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) { addEvent('raw', '-- 流结束 --'); break }

          const chunk = decoder.decode(value, { stream: true })
          sseBuffer += chunk

          const parts = sseBuffer.split(/\n\n/)
          sseBuffer = parts.pop() || ''

          for (const part of parts) {
            if (!part.trim()) continue
            addEvent('raw', part.trim().slice(0, 300))

            const dataLines: string[] = []
            let eventType = ''
            for (const line of part.split('\n')) {
              const trimmed = line.trim()
              if (trimmed.startsWith('data:')) dataLines.push(trimmed.slice(5).trim())
              else if (trimmed.startsWith('event:')) eventType = trimmed.slice(6).trim()
            }

            if (dataLines.length === 0) continue

            if (eventType === 'Error' || eventType === 'error') {
              for (const dataStr of dataLines) {
                try {
                  const err = JSON.parse(dataStr)
                  const msg = err.error_message || err.message || dataStr
                  throw new Error(`Coze 错误: ${msg}`)
                } catch (e) {
                  if (e instanceof Error && e.message.startsWith('Coze 错误:')) throw e
                }
              }
              continue
            }

            for (const dataStr of dataLines) {
              if (dataStr === '[DONE]') { addEvent('parsed', '[DONE]'); continue }

              try {
                const parsed = JSON.parse(dataStr)
                addEvent('parsed', JSON.stringify(parsed).slice(0, 300))

                const content = parsed.content || parsed.output || parsed.text || parsed.answer || ''
                if (typeof content === 'string') fullContent += content

                const url = parsed.url || parsed.video_url || parsed.videoUrl || parsed.file_url || parsed.fileUrl || ''
                if (url) { foundUrl = url; addEvent('url', `发现视频链接: ${url}`); break }

                if (parsed.output) {
                  if (typeof parsed.output === 'string') {
                    const outUrl = extractVideoUrl(parsed.output)
                    if (outUrl) { foundUrl = outUrl; addEvent('url', `从output文本发现: ${outUrl}`); break }
                  } else if (typeof parsed.output === 'object') {
                    const outUrl = parsed.output.url || parsed.output.video_url || parsed.output.file_url || ''
                    if (outUrl) { foundUrl = outUrl; addEvent('url', `从output对象发现: ${outUrl}`); break }
                  }
                }

                const attachments = parsed.attachments || parsed.files || []
                if (Array.isArray(attachments)) {
                  for (const att of attachments) {
                    const attUrl = att.url || att.file_url || att.download_url || ''
                    if (attUrl) { foundUrl = attUrl; addEvent('url', `从附件发现: ${attUrl}`); break }
                  }
                  if (foundUrl) break
                }

                if (parsed.data && typeof parsed.data === 'object') {
                  const dataUrl = parsed.data.url || parsed.data.video_url || parsed.data.file_url || ''
                  if (dataUrl) { foundUrl = dataUrl; addEvent('url', `从data对象发现: ${dataUrl}`); break }
                }

                if (parsed.message && typeof parsed.message === 'object') {
                  if (parsed.message.content) fullContent += String(parsed.message.content)
                }
              } catch {
                const urlFromStr = extractVideoUrl(dataStr)
                if (urlFromStr) { foundUrl = urlFromStr; addEvent('url', `发现视频链接: ${urlFromStr}`); break }
              }
            }

            if (foundUrl) break
          }

          if (!foundUrl) {
            const urlFromContent = extractVideoUrl(fullContent)
            if (urlFromContent) { foundUrl = urlFromContent; addEvent('url', `从内容中发现: ${urlFromContent}`) }
          }

          if (foundUrl) break
        }

        if (!foundUrl && fullContent) {
          const urlFromContent = extractVideoUrl(fullContent)
          if (urlFromContent) foundUrl = urlFromContent
        }

        if (foundUrl) {
          setVideoUrl(foundUrl)
          setPhase('done')
          addEvent('url', `最终视频链接: ${foundUrl}`)
          onGenerationDone(foundUrl)
          setShowLog(false)
        } else {
          setPhase('done')
          addEvent('raw', `完整响应: ${fullContent.slice(0, 1000)}`)
        }
      }
    } catch (err) {
      onGenerationStop()
      if (err instanceof DOMException && err.name === 'AbortError') { setPhase('idle'); return }
      const msg = err instanceof Error ? err.message
        : typeof err === 'string' ? err
        : JSON.stringify(err)
      addEvent('raw', `错误详情: ${msg}`)
      setErrorMsg(msg || '未知错误')
      setPhase('error')
    }
  }, [zhuti, shuiyin, onGenerationStart, onGenerationStop, onGenerationDone])

  return (
    <section id="workflow" className="py-24 px-6 bg-white border-y border-stone-200">
      <div className="mx-auto max-w-3xl">
        <FadeIn>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900">
              AI 视频生成工作流
            </h2>
          </div>
          <p className="text-stone-500 text-lg mb-12 max-w-2xl">
            您可在下方输入主题试用工作流；视频渲染周期较长，建议先浏览完整制作流程，等您看完时，成片大概率已渲染完成。
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">水印</label>
                <input
                  type="text"
                  value={shuiyin}
                  onChange={e => setShuiyin(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="万物指南"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">视频主题</label>
                <input
                  type="text"
                  value={zhuti}
                  onChange={e => setZhuti(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="例如：牛顿第一定律"
                />
              </div>
            </div>

            <button
              onClick={runWorkflow}
              disabled={phase === 'running'}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {phase === 'running' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              生成视频
            </button>

            {phase === 'running' && (
              <p className="text-sm text-stone-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                正在生成中... 大概3-5分钟，您可继续浏览其他内容
              </p>
            )}

            <AnimatePresence mode="wait">
              {phase === 'done' && videoUrl && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {isProduction || proxyFailed ? (
                    <div className="rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 p-8 text-center space-y-4">
                      <Play size={32} className="text-white mx-auto opacity-80" />
                      <p className="text-white text-lg font-medium">视频已生成完毕</p>
                      <p className="text-stone-400 text-sm">点击下方按钮在新标签页播放</p>
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100 transition-all active:scale-[0.98]"
                      >
                        <Play size={18} />
                        播放视频
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-stone-200 bg-black">
                      <video
                        src={`/api/video-proxy?url=${encodeURIComponent(videoUrl)}`}
                        controls
                        playsInline
                        preload="auto"
                        className="w-full aspect-video object-contain"
                        onError={() => setProxyFailed(true)}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {phase === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-4 text-sm bg-red-50 text-red-700 flex items-start gap-2"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p>{errorMsg}</p>
                    <button
                      onClick={runWorkflow}
                      className="mt-2 text-red-600 underline underline-offset-2 hover:text-red-800"
                    >
                      重试
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Streaming log */}
            {events.length > 0 && (
              <div className="border-t border-stone-200 pt-4">
                <button
                  onClick={() => setShowLog(!showLog)}
                  className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors mb-3"
                >
                  {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  调用过程日志 ({events.length} 条)
                  {phase === 'running' && <Loader2 size={12} className="animate-spin" />}
                </button>

                <AnimatePresence>
                  {showLog && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-stone-900 rounded-xl p-4 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed space-y-0.5">
                        {events.map((ev, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-stone-500 shrink-0">{new Date(ev.ts).toLocaleTimeString()}</span>
                            <span
                              className={
                                ev.type === 'url' ? 'text-green-400'
                                : ev.type === 'parsed' ? 'text-blue-300'
                                : 'text-stone-300'
                              }
                            >
                              {ev.content.length > 300 ? ev.content.slice(0, 300) + '...' : ev.content}
                            </span>
                          </div>
                        ))}
                        {phase === 'running' && (
                          <div className="flex gap-2 text-stone-400">
                            <Loader2 size={12} className="animate-spin mt-0.5" />
                            <span>等待更多数据...</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

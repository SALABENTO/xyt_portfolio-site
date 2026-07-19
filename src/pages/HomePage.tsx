import { useState, useCallback, useEffect } from 'react'
import { Navbar } from '../components/Navbar'
import { VideoShowcase } from '../components/VideoShowcase'
import { TextSection } from '../components/TextSection'
import { ProductionSteps } from '../components/ProductionSteps'
import { CozeWorkflow } from '../components/CozeWorkflow'
import { Footer } from '../components/Footer'
import { ThankYou } from '../components/ThankYou'
import { FadeIn } from '../components/animations/FadeIn'
import { AnimatedBackground } from '../components/animations/AnimatedBackground'
import { GlobalToast, FloatingLoading } from '../components/GlobalToast'
import { ArrowDown, Layers, Lightbulb, Wand2 } from 'lucide-react'
import type { VideoItem, TextSection as TextSectionType, ProductionStep } from '../types'

const heroTitle = 'hi，面试官好'
const heroSubtitle = '这是一次我的简单尝试 从调研到落地花费共计8小时'

const videos: VideoItem[] = [
  {
    id: '1',
    title: '自动生成视频工作流展示',
    description: '',
    videoUrl: '/videos/1c0010fb-14c6-46d0-91da-cb670e7fa17d.mp4',
    uploadedAt: '2026-07-19T09:32:22.540Z',
  },
]

const textSections: TextSectionType[] = [
  {
    id: '1',
    title: '关于这个项目',
    content: '最初想使用Codex 实现视频混剪功能，但该工具在国内无法正常访问使用，其次混剪视频普遍质量不佳，因此我更换了合规可用的国内替代方案。最终基于 Coze 平台，搭建出一套从素材生成可编辑的剪映工程文件一键成片的 AI 视频全自动化工作流。\n{{image:coze___.png}}{{image:jianying.png}}',
    order: 0,
  },
]

const productionSteps: ProductionStep[] = [
  {
    id: '1',
    title: '步骤 1：业务调研，确定内容方向',
    description: '通过 workbuddy 调研抖音教育赛道账号内容调性，结合K12产品定位，确定以知识科普为核心，搭建 AI 视频自动化工作流。',
    order: 0,
  },
  {
    id: '2',
    title: '步骤 2：技术选型，选定 Coze 搭建底层流程',
    description: '调研 Codex：成片效果不佳、国内无法直连，且仅支持已有素材混剪，无公司存量素材，无法落地；\n测试国内同类 AI 智能体，验证国产工具可替代海外方案；\n对比多款工具后选择上手门槛低、搭建效率高的 Coze；\n参考 B 站教程，1 天完成自动化工作流开发，掌握可视化节点与代码节点联动开发。',
    order: 1,
  },
  {
    id: '3',
    title: '步骤 3：搭配剪映插件，打通素材至剪辑完整链路',
    description: 'Coze 仅能产出图文、音频素材，无法导出剪映工程文件；接入生态成熟的剪映小助手插件，实现素材一键导入剪映、生成可二次编辑草稿，完成全自动化剪辑链路。',
    order: 2,
  },
  {
    id: '4',
    title: '步骤 4：开发配套网站，实现作品不仅能看，也能体验',
    description: '仅展示成片形式单一，为此搭建作品集网站，访客输入主题即可在线完整试用整套 AI 视频生成工作流。',
    order: 3,
  },
]

interface ToastItem {
  id: string
  message: string
  onClick?: () => void
}

export function HomePage() {
  const [generating, setGenerating] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, onClick?: () => void) => {
    const id = Date.now().toString(36)
    setToasts(prev => [...prev.slice(-2), { id, message, onClick }])
    if (!onClick) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 6000)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleGenerationStart = useCallback(() => {
    setGenerating(true)
  }, [])

  const handleGenerationStop = useCallback(() => {
    setGenerating(false)
  }, [])

  const handleGenerationDone = useCallback((_videoUrl: string) => {
    setGenerating(false)
    addToast('视频已生成完毕，点击查看', () => {
      scrollTo('workflow')
    })
  }, [addToast, scrollTo])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      addToast(detail.message, detail.onClick)
    }
    window.addEventListener('toast:show', handler)
    return () => window.removeEventListener('toast:show', handler)
  }, [addToast])

  return (
    <div className="min-h-screen">
      <Navbar onNavigate={scrollTo} />

      {/* Hero */}
      <section
        id="hero"
        className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 relative overflow-hidden"
      >
        <AnimatedBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-3xl">
          <FadeIn>
            <h1 className="text-5xl md:text-7xl font-bold text-stone-900 tracking-tight leading-tight">
              {heroTitle}
            </h1>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-xl md:text-2xl text-stone-500 mt-6 leading-relaxed text-balance">
              {heroSubtitle}
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-wrap justify-center gap-4 mt-12">
              {[
                { id: 'workflow', icon: Wand2, label: 'AI 工作流' },
                { id: 'videos', icon: Layers, label: '视频作品' },
                { id: 'about', icon: Lightbulb, label: '项目介绍' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="flex items-center gap-2.5 rounded-2xl bg-white border border-stone-200 px-5 py-3 text-sm font-medium text-stone-700 hover:border-accent/30 hover:text-accent hover:shadow-md transition-all active:scale-[0.97]"
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </div>
          </FadeIn>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-stone-300">向下滚动</span>
          <ArrowDown size={16} className="text-stone-300" />
        </div>
      </section>

      <CozeWorkflow
        onGenerationStart={handleGenerationStart}
        onGenerationStop={handleGenerationStop}
        onGenerationDone={handleGenerationDone}
      />

      <VideoShowcase videos={videos} />
      <TextSection sections={textSections} />
      <ProductionSteps steps={productionSteps} />
      <ThankYou />
      <Footer />

      <FloatingLoading
        show={generating}
        message="大概3-5分钟，您可继续浏览其他内容"
      />
      <GlobalToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

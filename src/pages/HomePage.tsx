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
  {
    id: '2',
    title: '项目学习心得',
    content: '其实最开始接触这个项目的时候，我对AI工作流搭建完全是零基础，只知道AI能写文案、生图，但怎么把这些能力串起来、变成一套能用的生产工具，完全没概念。最开始研究Codex的时候，光是搞清楚它的节点逻辑就花了大半天，还踩了国内访问不了的坑，一度觉得挺难的。\n\n后来换成Coze，从最基础的单个Bot开始摸索，慢慢搞懂了插件怎么接、变量怎么传、节点之间怎么串联。中间也踩了不少坑，比如生成的文案格式不对、剪映插件传参失败、图片和配音时长对不上，来来回回调了好多次才把整条链路跑通。当第一次输入一个主题，看着它自动出文案、出图、配音，最后直接在剪映里生成一条完整视频的时候，那种成就感还是挺强的。\n\n整个学下来最大的感受是，AI工具其实没有想象中那么高不可攀，核心是搞清楚它的逻辑，知道每个环节能做什么、不能做什么。而且对编导来说，懂AI工作流真的是加分项，以前一条视频从写文案到找素材再到剪辑，少说也要大半天，现在基础版的几分钟就能出一条，省下来的时间可以专心磨钩子、磨内容质量。\n\n这次因为时间紧，只做了最基础的版本，还有很多可以优化的地方，比如更精准的人群分析、卖点拆解、爆款要素自动提取。但从完全零基础到亲手搭出一套能跑通的自动化工作流，这个过程本身就挺有收获的，也让我对AI+编导的结合有了更实在的理解。',
    order: 1,
  },
]

const productionSteps: ProductionStep[] = [
  {
    id: '1',
    title: '步骤 1：业务调研，确定内容方向',
    description: '用Workbuddy做了教育赛道账号数据分析，结合K12产品定位，锁定了精致妈妈人群，对标公司物理启蒙课，确定先以知识科普为核心，搭建AI视频自动化工作流。核心要解决批量出脚本和拆解竞品爆款这两个编导痛点。',
    order: 0,
  },
  {
    id: '2',
    title: '步骤 2：技术选型，选定 Coze 搭建底层流程',
    description: '仔细看了Codex，发现三大坑：国内打不开、混剪素材质量不稳、没法用企业自有素材库。对比几个国产平台后，选了上手快、插件多的Coze。\n因为时间有限，没搞复杂的代码节点，直接用可视化拖拽搭核心流程，一天之内串好了素材录入、爆款拆解、人群分析、脚本生成四个模块，学会了低代码快速搭业务化AI流水线。',
    order: 1,
  },
  {
    id: '3',
    title: '步骤 3：搭配剪映插件，打通素材至剪辑完整链路',
    description: 'Coze本身只能出图文和音频，无法导出剪映工程文件，为了能直接出成片，我接了剪映小助手插件，实现一键同步到剪映生成草稿，可二次手动精修，完成全自动化剪辑链路，让AI做标准化的，人来把控调性和转化，实现人机协同。',
    order: 2,
  },
  {
    id: '4',
    title: '步骤 4：开发配套网站，实现作品不仅能看，也能体验',
    description: '本来想做功能齐全的多页面站点，但为了优先保证后端工作流好用，只做了个简单Demo，能输入主题、一键生成视频，展示完整工作流效果。',
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
      <ProductionSteps steps={productionSteps} />
      <TextSection sections={textSections} />
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

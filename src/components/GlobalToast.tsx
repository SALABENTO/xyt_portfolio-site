import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
  onClick?: () => void
}

interface GlobalToastProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function GlobalToast({ toasts, onDismiss }: GlobalToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.button
            key={toast.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            onClick={toast.onClick}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-stone-900 text-white px-5 py-3.5 shadow-2xl shadow-stone-900/20 cursor-pointer hover:bg-stone-800 transition-colors active:scale-[0.98]"
          >
            <CheckCircle2 size={18} className="text-green-400 shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">{toast.message}</span>
            <button
              onClick={e => {
                e.stopPropagation()
                onDismiss(toast.id)
              }}
              className="ml-2 p-0.5 rounded-full text-stone-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface FloatingLoadingProps {
  show: boolean
  message: string
}

export function FloatingLoading({ show, message }: FloatingLoadingProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-6 z-[99] flex items-center gap-3 rounded-2xl bg-white border border-stone-200 px-4 py-3 shadow-xl"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-accent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-accent" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">视频生成中</p>
            <p className="text-xs text-stone-400">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function useToastManager() {
  // Simple in-memory toast manager using a custom event
  return {
    show: (message: string, onClick?: () => void) => {
      window.dispatchEvent(
        new CustomEvent('toast:show', { detail: { message, onClick } })
      )
    },
  }
}

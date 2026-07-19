import { useState } from 'react'
import { FadeIn, StaggerContainer, StaggerItem } from './animations/FadeIn'
import { ImageLightbox } from './ImageLightbox'
import type { ProductionStep } from '../types'

const IMAGE_RE = /\{\{image:([a-zA-Z0-9_.-]+)\}\}/g

function resolveImageUrl(id: string): string {
  return `/images/${id}`
}

export function ProductionSteps({ steps }: { steps: ProductionStep[] }) {
  const sorted = [...steps].sort((a, b) => a.order - b.order)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  function renderDescription(description: string) {
    const parts: (string | { type: 'image'; id: string })[] = []
    let lastIdx = 0
    let m: RegExpExecArray | null

    IMAGE_RE.lastIndex = 0
    while ((m = IMAGE_RE.exec(description)) !== null) {
      if (m.index > lastIdx) {
        parts.push(description.slice(lastIdx, m.index))
      }
      parts.push({ type: 'image', id: m[1] })
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < description.length) {
      parts.push(description.slice(lastIdx))
    }

    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return part.split('\n').map((p, j) => (
          <p key={`${i}-${j}`} className="text-stone-500 leading-relaxed mb-3 last:mb-0">
            {p || ' '}
          </p>
        ))
      }
      const src = resolveImageUrl(part.id)
      return (
        <figure key={i} className="my-4">
          <img
            src={src}
            alt=""
            className="rounded-xl max-w-full h-auto cursor-zoom-in hover:opacity-90 transition-opacity"
            onClick={() => setLightboxSrc(src)}
          />
        </figure>
      )
    })
  }

  return (
    <section id="steps" className="py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            制作历程
          </h2>
          <p className="text-stone-500 text-lg mb-16">
            从灵感到成片，每一步都是成长的印记。
          </p>
        </FadeIn>

        <StaggerContainer>
          <div className="relative">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-stone-200" />

            {sorted.map(step => (
              <StaggerItem key={step.id}>
                <div className="relative pl-14 pb-12 last:pb-0">
                  <div className="absolute left-[13px] top-2 w-[13px] h-[13px] rounded-full bg-white border-2 border-accent ring-4 ring-accent-light" />

                  {step.date && (
                    <span className="text-xs font-medium text-accent uppercase tracking-wider">
                      {step.date}
                    </span>
                  )}
                  <h3 className="text-xl font-semibold text-stone-900 mt-1 mb-2">
                    {step.title}
                  </h3>
                  <div>{renderDescription(step.description)}</div>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </div>
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </section>
  )
}

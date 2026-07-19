import { useState } from 'react'
import { motion } from 'framer-motion'
import { FadeIn } from './animations/FadeIn'
import { ImageLightbox } from './ImageLightbox'
import type { TextSection as TextSectionType } from '../types'

const IMAGE_RE = /\{\{image:([a-zA-Z0-9_.-]+)\}\}/g

type Part = string | { type: 'image'; id: string }

function resolveImageUrl(id: string): string {
  return `/images/${id}`
}

export function TextSection({ sections }: { sections: TextSectionType[] }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  if (sections.length === 0) return null

  function parseParts(content: string): Part[] {
    const parts: Part[] = []
    let lastIdx = 0
    let m: RegExpExecArray | null

    IMAGE_RE.lastIndex = 0
    while ((m = IMAGE_RE.exec(content)) !== null) {
      if (m.index > lastIdx) {
        parts.push(content.slice(lastIdx, m.index))
      }
      parts.push({ type: 'image', id: m[1] })
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < content.length) {
      parts.push(content.slice(lastIdx))
    }
    return parts
  }

  function renderContent(content: string) {
    const parts = parseParts(content)

    // Merge consecutive images into groups for side-by-side layout
    const grouped: (Part | Part[])[] = []
    let i = 0
    while (i < parts.length) {
      const part = parts[i]
      if (typeof part === 'string') {
        // Skip empty/whitespace-only strings between consecutive images
        const trimmed = part.trim()
        const nextIsImage = i + 1 < parts.length && typeof parts[i + 1] !== 'string'
        const prevIsImage = i > 0 && typeof parts[i - 1] !== 'string'
        if (trimmed === '' && nextIsImage && prevIsImage) {
          // Whitespace between images — skip it, they'll be grouped
          i++
          continue
        }
        grouped.push(part)
        i++
      } else {
        // Image — collect consecutive images
        const imageGroup: Part[] = [part]
        i++
        while (i < parts.length) {
          const next = parts[i]
          if (typeof next === 'string' && next.trim() === '') {
            // Whitespace between images, skip and continue collecting
            i++
            if (i < parts.length && typeof parts[i] !== 'string') {
              imageGroup.push(parts[i] as { type: 'image'; id: string })
              i++
              continue
            }
            // Not an image after whitespace — stop
            i--
            break
          } else if (typeof next !== 'string') {
            imageGroup.push(next)
            i++
          } else {
            break
          }
        }
        grouped.push(imageGroup.length > 1 ? imageGroup : imageGroup[0])
      }
    }

    return grouped.map((item, idx) => {
      if (typeof item === 'string') {
        return item.split('\n').map((p, j) => (
          <p key={`${idx}-${j}`} className="text-stone-600 leading-relaxed mb-4 last:mb-0">
            {p || ' '}
          </p>
        ))
      }

      if (Array.isArray(item)) {
        // Consecutive images — side by side grid
        const cols = item.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        return (
          <div key={`grid-${idx}`} className={`grid ${cols} gap-4 my-6`}>
            {item.map((imgPart, imgIdx) => {
              const src = resolveImageUrl((imgPart as { type: 'image'; id: string }).id)
              return (
                <motion.figure
                  key={imgIdx}
                  className="cursor-zoom-in"
                  animate={{ y: [0, -12, 0] }}
                  transition={{
                    duration: 4 + imgIdx * 0.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: imgIdx * 0.8,
                  }}
                  onClick={() => setLightboxSrc(src)}
                >
                  <img
                    src={src}
                    alt=""
                    className="rounded-xl w-full h-auto hover:opacity-90 transition-opacity"
                  />
                </motion.figure>
              )
            })}
          </div>
        )
      }

      // Single image — full width
      const src = resolveImageUrl(item.id)
      return (
        <motion.figure
          key={`img-${idx}`}
          className="my-6 cursor-zoom-in"
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          onClick={() => setLightboxSrc(src)}
        >
          <img
            src={src}
            alt=""
            className="rounded-xl max-w-full h-auto mx-auto hover:opacity-90 transition-opacity"
          />
        </motion.figure>
      )
    })
  }

  return (
    <section id="about" className="py-24 px-6 bg-white border-y border-stone-200">
      <div className="mx-auto max-w-3xl">
        {sections
          .sort((a, b) => a.order - b.order)
          .map((section, idx) => (
            <FadeIn key={section.id} delay={idx * 0.1}>
              <div className="mb-16 last:mb-0">
                <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-6">
                  {section.title}
                </h2>
                <div className="prose prose-stone prose-lg max-w-none">
                  {renderContent(section.content)}
                </div>
              </div>
            </FadeIn>
          ))}
      </div>
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </section>
  )
}

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function ThankYou() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 px-6 relative overflow-hidden" ref={ref}>
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-50 via-white to-stone-50 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-16 h-px bg-stone-300 mx-auto mb-10 origin-center"
        />

        {/* Main text */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-stone-900"
        >
          感谢观看
        </motion.p>

        {/* Sub text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 text-lg text-stone-400"
        >
          期待与您进一步交流
        </motion.p>

        {/* Floating dots */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: [0, 0.6, 0], scale: [0.8, 1.2, 0.8] } : {}}
            transition={{
              duration: 3,
              delay: 0.8 + i * 0.4,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
            className="absolute w-1 h-1 rounded-full bg-accent/30"
            style={{
              top: `${30 + i * 20}%`,
              left: `${20 + i * 25}%`,
            }}
          />
        ))}
      </div>
    </section>
  )
}

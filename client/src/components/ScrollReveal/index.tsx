import { useEffect, useRef, useState, useMemo } from 'react'

type AnimationVariant = 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right'

interface ScrollRevealProps {
  children: React.ReactNode
  variant?: AnimationVariant
  threshold?: number
  className?: string
  delay?: number
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

const variantClasses: Record<AnimationVariant, { hidden: string; visible: string }> = {
  'fade-in': {
    hidden: 'opacity-0',
    visible: 'opacity-100',
  },
  'slide-up': {
    hidden: 'opacity-0 translate-y-8',
    visible: 'opacity-100 translate-y-0',
  },
  'slide-left': {
    hidden: 'opacity-0 translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
  'slide-right': {
    hidden: 'opacity-0 -translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
}

/**
 * ScrollReveal — Animates children into view using IntersectionObserver.
 *
 * Uses GPU-composited CSS transforms (opacity + translate) only.
 * Respects `prefers-reduced-motion: reduce` — shows content immediately.
 * Fires once (unobserves after first intersection).
 */
export function ScrollReveal({
  children,
  variant = 'fade-in',
  threshold = 0.1,
  className = '',
  delay = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const prefersReduced = useReducedMotion()

  const isVisible = prefersReduced || visible

  useEffect(() => {
    if (prefersReduced) {
      setVisible(true)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [prefersReduced, threshold])

  const { hidden, visible: visibleClass } = variantClasses[variant]

  const style = useMemo(
    () =>
      delay > 0
        ? ({
            transitionDelay: `${delay}ms`,
            '--reveal-delay': `${delay}ms`,
          } as React.CSSProperties)
        : undefined,
    [delay],
  )

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? visibleClass : hidden}`}
      style={{
        ...style,
        transition:
          'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: isVisible ? undefined : 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

export default ScrollReveal

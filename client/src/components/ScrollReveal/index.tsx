import { useEffect, useRef, useState, useCallback } from 'react'
import { animate, type JSAnimation } from 'animejs'

type AnimationVariant = 'fade-in' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale-in' | 'blur-in'

interface ScrollRevealProps {
  children: React.ReactNode
  variant?: AnimationVariant
  threshold?: number
  className?: string
  delay?: number
  duration?: number
  stagger?: number
  easing?: string
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

const variantParams: Record<AnimationVariant, Record<string, unknown>> = {
  'fade-in': {
    opacity: [0, 1],
  },
  'slide-up': {
    opacity: [0, 1],
    translateY: [40, 0],
  },
  'slide-left': {
    opacity: [0, 1],
    translateX: [40, 0],
  },
  'slide-right': {
    opacity: [0, 1],
    translateX: [-40, 0],
  },
  'scale-in': {
    opacity: [0, 1],
    scale: [0.9, 1],
  },
  'blur-in': {
    opacity: [0, 1],
    filter: ['blur(8px)', 'blur(0px)'],
  },
}

export function ScrollReveal({
  children,
  variant = 'fade-in',
  threshold = 0.1,
  className = '',
  delay = 0,
  duration = 800,
  easing = 'easeOutQuad',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const animRef = useRef<JSAnimation | null>(null)
  const hasAnimated = useRef(false)

  const runAnimation = useCallback(() => {
    if (!ref.current || hasAnimated.current) return
    hasAnimated.current = true

    const params = variantParams[variant]
    animRef.current = animate(ref.current, {
      ...params,
      duration,
      delay,
      ease: easing as any,
    })
  }, [variant, duration, delay, easing])

  useEffect(() => {
    if (prefersReduced) {
      if (ref.current) {
        ref.current.style.opacity = '1'
        ref.current.style.transform = 'none'
        ref.current.style.filter = 'none'
      }
      return
    }

    const el = ref.current
    if (!el) return

    // Set initial hidden state
    el.style.opacity = '0'

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runAnimation()
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [prefersReduced, threshold, runAnimation])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

export default ScrollReveal

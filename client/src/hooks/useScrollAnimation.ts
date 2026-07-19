import { useEffect, useRef, useState, useCallback } from 'react'

interface UseScrollAnimationOptions {
  /** Intersection threshold (0–1, default 0.1) */
  threshold?: number
  /**
   * Margin around the root, shrinks the active area.
   * A negative bottom margin fires earlier (default '-40px').
   */
  rootMargin?: string
  /** Only animate once (default true) */
  once?: boolean
}

interface UseScrollAnimationReturn {
  /** Attach to the target element via ref */
  ref: React.RefCallback<HTMLElement>
  /** Whether the element is currently in view */
  inView: boolean
  /** Whether the element has ever been in view (useful for "once" animations) */
  hasAnimated: boolean
}

/**
 * Hook that tracks when an element enters the viewport
 * using Intersection Observer.
 *
 * Respects `prefers-reduced-motion` — when the user prefers
 * reduced motion, `inView` and `hasAnimated` are set to `true`
 * immediately so content is always visible.
 *
 * @example
 * const { ref, hasAnimated } = useScrollAnimation({ threshold: 0.2 })
 * return <div ref={ref} className={hasAnimated ? 'visible' : 'hidden'}>...</div>
 */
export function useScrollAnimation(
  options: UseScrollAnimationOptions = {},
): UseScrollAnimationReturn {
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px', once = true } = options

  const [inView, setInView] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  // Detect reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // When user prefers reduced motion, show everything immediately
  useEffect(() => {
    if (reducedMotion) {
      setInView(true)
      setHasAnimated(true)
    }
  }, [reducedMotion])

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      elementRef.current = node
      if (!node || reducedMotion) return

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true)
            setHasAnimated(true)

            if (once) {
              observerRef.current?.unobserve(node)
            }
          } else if (!once) {
            setInView(false)
          }
        },
        { threshold, rootMargin },
      )

      observerRef.current.observe(node)
    },
    [threshold, rootMargin, once, reducedMotion],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return { ref, inView, hasAnimated }
}

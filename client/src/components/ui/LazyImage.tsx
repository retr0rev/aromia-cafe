import { useState, useEffect, useRef } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  /** Aspect ratio for placeholder (default '4/3') */
  aspectRatio?: string
  /** CSS classes for the wrapper */
  wrapperClassName?: string
  /** CSS classes for the image element */
  imgClassName?: string
}

/**
 * Image with native lazy loading and a pulsing placeholder.
 *
 * Uses IntersectionObserver to detect when the image enters
 * the viewport, then loads it with a fade-in transition.
 * Respects the native `loading="lazy"` attribute as a fallback.
 *
 * @example
 * <LazyImage
 *   src="/menu/latte.jpg"
 *   alt="Cafe Latte"
 *   aspectRatio="1/1"
 * />
 */
export function LazyImage({
  src,
  alt,
  aspectRatio = '4/3',
  wrapperClassName = '',
  imgClassName = '',
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Only start loading when the image is near the viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-sage-50 ${wrapperClassName}`}
      style={{ aspectRatio }}
    >
      {/* Placeholder — shown until image loads */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-sage-100 transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'opacity-100 animate-pulse'
        }`}
        aria-hidden="true"
      >
        <svg
          className="h-10 w-10 text-sage-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>

      {/* Actual image — only rendered when near viewport */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface SkeletonProps {
  /** Width — accepts any CSS value (default: '100%') */
  width?: string
  /** Height — accepts any CSS value (default: '1rem') */
  height?: string
  /** Border radius (default: '0.375rem') */
  rounded?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * A single skeleton rectangle with pulse animation.
 * Used to build loading placeholders for any layout.
 */
export function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = '0.375rem',
  className = '',
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-sage-100 ${className}`}
      style={{ width, height, borderRadius: rounded }}
    />
  )
}

interface LoadingSkeletonProps {
  /** Loading text shown to screen readers (defaults to i18n loading.default) */
  srText?: string
  /** Optional inline label for i18n key */
  labelKey?: string
  /** CSS classes for the wrapper */
  className?: string
  children: React.ReactNode
}

/**
 * Accessible loading skeleton wrapper.
 * Renders children (skeleton shapes) inside a section with a
 * visually-hidden loading message for screen readers.
 *
 * @example
 * <LoadingSkeleton>
 *   <Skeleton width="200px" height="24px" />
 *   <Skeleton width="60%" height="16px" />
 * </LoadingSkeleton>
 */
export function LoadingSkeleton({
  srText,
  labelKey,
  className = '',
  children,
}: LoadingSkeletonProps) {
  const { t } = useTranslation()

  const label = srText ?? t(labelKey ?? 'loading.default')

  return (
    <section
      className={className}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      {children}
    </section>
  )
}

// ── Preset skeleton patterns ────────────────────────────────────────────────

interface GridSkeletonProps {
  /** Number of skeleton cards to render (default 6) */
  count?: number
  /** Number of columns at sm / md / lg breakpoints */
  columns?: { sm?: number; md?: number; lg?: number }
  /** Aspect ratio for image placeholder (default '4/3') */
  imageAspect?: string
  /** CSS classes for the grid wrapper */
  className?: string
}

/**
 * A grid of card-shaped skeletons — the most common loading pattern.
 *
 * Renders N skeleton cards, each with an image placeholder and text lines,
 * in a responsive CSS grid.
 */
export function CardGridSkeleton({
  count = 6,
  columns = { sm: 1, md: 2, lg: 3 },
  imageAspect = '4/3',
  className = '',
}: GridSkeletonProps) {
  const { t } = useTranslation()

  const gridCols = useMemo(() => {
    const c: string[] = ['grid-cols-1']
    if (columns.sm) c.push(`sm:grid-cols-${columns.sm}`)
    if (columns.md) c.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) c.push(`lg:grid-cols-${columns.lg}`)
    return c.join(' ')
  }, [columns])

  return (
    <section
      role="status"
      aria-label={t('loading.default')}
      aria-busy="true"
      className={className}
    >
      <span className="sr-only">{t('loading.default')}</span>

      <div className={`grid gap-5 ${gridCols}`}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100"
          >
            {/* Image placeholder */}
            <div
              className="animate-pulse bg-sage-100"
              style={{ aspectRatio: imageAspect }}
            />
            {/* Text lines */}
            <div className="space-y-2.5 p-4">
              <Skeleton width="75%" height="1.25rem" />
              <Skeleton width="100%" height="0.875rem" />
              <Skeleton width="33%" height="1rem" rounded="0.25rem" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Thin horizontal skeleton — useful for section headers, titles, etc.
 */
export function TitleSkeleton({
  width = '12rem',
  className = '',
}: {
  width?: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto animate-pulse rounded bg-sage-100 ${className}`}
      style={{ width, height: '2.25rem' }}
    />
  )
}

/**
 * Pill-shaped skeleton — useful for tab bars, filter chips, etc.
 */
export function PillSkeleton({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex gap-2 overflow-hidden ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-sage-100"
        />
      ))}
    </div>
  )
}

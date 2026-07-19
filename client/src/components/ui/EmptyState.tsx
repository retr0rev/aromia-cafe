import { useTranslation } from 'react-i18next'

interface EmptyStateProps {
  /** Title — falls back to section heading if needed */
  title?: string
  /** Helpful message explaining why nothing is here */
  message: string
  /** Optional icon override */
  icon?: React.ReactNode
  /** Additional CSS classes for the wrapper */
  className?: string
}

/**
 * Reusable empty state with a helpful message (bilingual via i18n).
 *
 * Used when data loads successfully but contains zero results.
 *
 * @example
 * <EmptyState
 *   message={t('popular.empty')}
 * />
 */
export function EmptyState({
  title,
  message,
  icon,
  className = '',
}: EmptyStateProps) {
  const { t } = useTranslation()

  return (
    <section className={`py-16 md:py-24 ${className}`}>
      <div className="mx-auto max-w-md px-4 text-center">
        {title && (
          <h2 className="mb-6 text-3xl font-bold text-sage-800 md:text-4xl">
            {title}
          </h2>
        )}

        {icon ?? (
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-5 text-sage-300"
            aria-hidden="true"
          >
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}

        <p className="text-base leading-relaxed text-gray-500">
          {message}
        </p>

        <p className="mt-3 text-sm text-gray-400">
          {t('menu.empty')}
        </p>
      </div>
    </section>
  )
}

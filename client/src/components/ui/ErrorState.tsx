import { useTranslation } from 'react-i18next'

interface ErrorStateProps {
  /** Optional custom message (falls back to i18n error.server) */
  message?: string
  /** Whether to show the retry button (default true) */
  showRetry?: boolean
  /** Optional retry label override */
  retryLabel?: string
  /** Called when retry button is clicked */
  onRetry?: () => void
  /** Additional CSS classes for the wrapper */
  className?: string
  /** Optional custom icon override */
  icon?: React.ReactNode
}

/**
 * Reusable error state with retry button (bilingual via i18n).
 *
 * Used whenever a data fetch fails — shows a clear error message
 * and an optional retry button.
 *
 * @example
 * <ErrorState onRetry={() => refetch()} />
 */
export function ErrorState({
  message,
  showRetry = true,
  retryLabel,
  onRetry,
  className = '',
  icon,
}: ErrorStateProps) {
  const { t } = useTranslation()

  return (
    <section
      className={`py-16 md:py-24 ${className}`}
      role="alert"
    >
      <div className="mx-auto max-w-7xl px-4 text-center">
        {icon ?? (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-red-300"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}

        <p className="mb-6 text-base text-gray-500">
          {message ?? t('error.server')}
        </p>

        {showRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-sage-500 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-sage-600 active:scale-95 min-h-[44px]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>{retryLabel ?? t('error.retry')}</span>
          </button>
        )}
      </div>
    </section>
  )
}

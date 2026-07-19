import { useTranslation } from 'react-i18next'

export interface PopularItem {
  id: number
  name_ar: string
  name_en: string
  price: number
  image_path: string | null
  category_name_ar: string
  category_name_en: string
}

export interface PopularItemsProps {
  items?: PopularItem[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

function SkeletonStrip() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center gap-4 shrink-0 rounded-xl bg-white/60 ring-1 ring-sage-100 p-3 w-64">
          <div className="w-16 h-16 rounded-lg animate-pulse bg-sage-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-sage-100" />
            <div className="h-3 w-16 animate-pulse rounded bg-sage-100" />
            <div className="h-4 w-12 animate-pulse rounded bg-sage-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PopularItems({ items, isLoading, isError, onRetry }: PopularItemsProps) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  return (
    <section id="popular-section" className="py-14 sm:py-20 px-4" aria-labelledby="popular-heading">
      <div className="mx-auto max-w-2xl">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-sage-500 shrink-0">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" fill="currentColor" />
          </svg>
          <h2
            id="popular-heading"
            className="text-xl font-bold text-sage-800 tracking-wide"
          >
            {t('popular.title')}
          </h2>
          <div className="flex-1 border-b border-sage-200/60" />
        </div>

        {isLoading ? (
          <SkeletonStrip />
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-gray-400">{t('error.server')}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-sage-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-600"
            >
              {t('error.retry')}
            </button>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400 text-sm">{t('popular.empty')}</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
            {items.map((item) => {
              const itemName = isAr ? item.name_ar : item.name_en
              const categoryName = isAr ? item.category_name_ar : item.category_name_en
              const priceLabel = isAr
                ? `${item.price.toLocaleString('ar')} ل.س`
                : `${item.price.toLocaleString('en')} S.P`

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 shrink-0 snap-start rounded-xl bg-white/80 ring-1 ring-sage-100 p-3 w-64 transition-all duration-200 hover:ring-sage-200 hover:shadow-sm"
                >
                  {/* Image */}
                  {item.image_path ? (
                    <img
                      src={item.image_path}
                      alt={itemName}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 ring-1 ring-sage-50"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-sage-50 shrink-0 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage-200">
                        <rect x="2" y="2" width="20" height="20" rx="4" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M2 16l5-5 3 3 4-4 8 8" />
                      </svg>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-sage-500 uppercase tracking-wider">
                      {categoryName}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                      {itemName}
                    </h3>
                    <p className="text-sm font-bold text-sage-600 mt-1">{priceLabel}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useMemo } from 'react'
import sagePattern from '@/assets/brand/patterns/sage-green/Pattern - Aromia.png'

// ── Types ───────────────────────────────────────────────────────────────
interface Category {
  id: number
  name_ar: string
  name_en: string
  sort_order: number
}

interface Item {
  id: number
  category_id: number
  name_ar: string
  name_en: string
  ingredients_ar: string
  ingredients_en: string
  price: number
  image_path: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────
function formatPrice(price: number, isArabic: boolean): string {
  const formatted = price.toLocaleString()
  return isArabic ? `${formatted} ل.س` : `${formatted} S.P`
}

// ── Skeleton ────────────────────────────────────────────────────────────
function SkeletonMenu() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mx-auto mb-10 h-8 w-40 animate-pulse rounded bg-sage-100" />
        <nav className="mb-10 flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-sage-100" />
          ))}
        </nav>
        {[1, 2, 3].map((n) => (
          <div key={n} className="mb-10">
            <div className="mb-5 h-6 w-32 animate-pulse rounded bg-sage-100" />
            <div className="space-y-4">
              {[1, 2, 3].map((m) => (
                <div key={m} className="flex items-baseline justify-between gap-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-sage-100" />
                  <div className="h-4 flex-1 border-b border-dashed border-sage-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-sage-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Main component ───────────────────────────────────────────────────────

export function MenuSection() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const queryClient = useQueryClient()

  const {
    data: categories,
    isLoading: catsLoading,
    isError: catsError,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () =>
      fetch('/api/categories').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch categories')
        return r.json()
      }),
  })

  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () =>
      fetch('/api/items').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch items')
        return r.json()
      }),
  })

  const isLoading = catsLoading || itemsLoading
  const hasError = catsError || itemsError
  const isEmpty = !isLoading && !hasError && (!categories || categories.length === 0)

  const groupedItems = useMemo(() => {
    if (!items) return new Map<number, Item[]>()
    const map = new Map<number, Item[]>()
    for (const item of items) {
      const list = map.get(item.category_id) ?? []
      list.push(item)
      map.set(item.category_id, list)
    }
    return map
  }, [items])

  const [activeCatId, setActiveCatId] = useState<number | null>(
    () => categories?.[0]?.id ?? null,
  )

  useEffect(() => {
    if (!categories || categories.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (intersecting.length > 0) {
          const id = Number(intersecting[0].target.getAttribute('data-category-id'))
          if (!Number.isNaN(id)) setActiveCatId(id)
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 },
    )

    for (const cat of categories) {
      const el = document.getElementById(`category-${cat.id}`)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [categories])

  function scrollToCategory(id: number) {
    const el = document.getElementById(`category-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading) return <SkeletonMenu />

  if (hasError) {
    return (
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="mb-4 text-gray-500">{t('error.server')}</p>
          <button
            type="button"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['categories'] })
              void queryClient.invalidateQueries({ queryKey: ['items'] })
            }}
            className="rounded-lg bg-sage-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-600"
          >
            {t('error.retry')}
          </button>
        </div>
      </section>
    )
  }

  if (isEmpty) {
    return (
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-sage-800 md:text-4xl">{t('menu.title')}</h2>
          <p className="mt-6 text-lg text-gray-500">{t('menu.empty')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-16 md:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: `url(${sagePattern})`, backgroundSize: '300px' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl px-6">
        <h2 className="mb-10 text-center text-3xl font-bold text-sage-800 md:text-4xl">
          {t('menu.title')}
        </h2>

        {/* Sticky category tabs */}
        <nav
          className="sticky top-0 z-30 -mx-6 mb-12 overflow-x-auto px-6 py-3 backdrop-blur-sm"
          style={{
            WebkitOverflowScrolling: 'touch',
            backgroundColor: 'color-mix(in srgb, var(--color-sage-100) 20%, white)',
          }}
          role="tablist"
          aria-label={isArabic ? 'تصنيفات القائمة' : 'Menu categories'}
        >
          <div className="flex gap-2">
            {categories!.map((cat) => {
              const isActive = activeCatId === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 min-h-[40px] ${
                    isActive
                      ? 'bg-sage-500 text-white shadow-md shadow-sage-500/20'
                      : 'bg-white/80 text-sage-700 ring-1 ring-sage-200 hover:bg-sage-50 hover:ring-sage-300'
                  }`}
                >
                  {isArabic ? cat.name_ar : cat.name_en}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Category sections */}
        {categories!.map((cat) => {
          const catItems = groupedItems.get(cat.id) ?? []
          return (
            <section
              key={cat.id}
              id={`category-${cat.id}`}
              data-category-id={cat.id}
              className="mb-14 scroll-mt-28"
            >
              {/* Category header with decorative line */}
              <div className="mb-6 flex items-center gap-4">
                <h3 className="shrink-0 text-xl font-bold text-sage-700 tracking-wide">
                  {isArabic ? cat.name_ar : cat.name_en}
                </h3>
                <div className="flex-1 border-b border-sage-200/60" />
              </div>

              {catItems.length === 0 ? (
                <p className="py-8 text-center text-gray-400 text-sm">
                  {isArabic ? 'لا توجد منتجات في هذا القسم' : 'No items in this category'}
                </p>
              ) : (
                <div className="space-y-1">
                  {catItems.map((item, idx) => {
                    const name = isArabic ? item.name_ar : item.name_en
                    const desc = isArabic ? item.ingredients_ar : item.ingredients_en

                    return (
                      <div key={item.id}>
                        {/* Item row */}
                        <div className="group flex items-start gap-3 py-3.5">
                          {/* Image (small, optional) */}
                          {item.image_path && (
                            <img
                              src={item.image_path}
                              alt={name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-sage-100"
                              loading="lazy"
                            />
                          )}

                          {/* Name + description + price */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <h4 className="text-base font-semibold text-gray-900 group-hover:text-sage-700 transition-colors">
                                {name}
                              </h4>
                              <span className="flex-1 border-b border-dotted border-sage-200/50 translate-y-[-4px]" />
                              <span className="text-base font-bold text-sage-600 whitespace-nowrap">
                                {formatPrice(item.price, isArabic)}
                              </span>
                            </div>
                            {desc && (
                              <p className="mt-0.5 text-sm text-gray-400 leading-relaxed line-clamp-2">
                                {desc}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Subtle separator between items (not after last) */}
                        {idx < catItems.length - 1 && (
                          <div className="border-b border-sage-100/40" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}

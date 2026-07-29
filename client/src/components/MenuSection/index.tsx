import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useMemo, useRef } from 'react'
import { animate } from 'animejs'
import sagePattern from '@/assets/brand/patterns/sage-green/Pattern - Aromia.png'

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

function formatPrice(price: number, isArabic: boolean): string {
  const formatted = price.toLocaleString()
  return isArabic ? `${formatted} ل.س` : `${formatted} S.P`
}

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

function MenuItemRow({ item, isArabic, isLast }: { item: Item; isArabic: boolean; isLast: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const name = isArabic ? item.name_ar : item.name_en
  const desc = isArabic ? item.ingredients_ar : item.ingredients_en

  useEffect(() => {
    if (!rowRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate(rowRef.current!, {
            opacity: [0, 1],
            translateX: isArabic ? [20, 0] : [-20, 0],
            duration: 500,
            ease: 'easeOutQuad',
          })
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(rowRef.current)
    return () => observer.disconnect()
  }, [isArabic])

  return (
    <div ref={rowRef} style={{ opacity: 0 }}>
      <div className="group relative flex items-start gap-4 py-5 px-4 -mx-4 rounded-xl transition-all duration-300 hover:bg-white/60 hover:shadow-sm">
        {item.image_path && (
          <div className="relative shrink-0">
            <img
              src={item.image_path}
              alt={name}
              className="w-14 h-14 rounded-xl object-cover ring-1 ring-sage-100/80 shadow-sm"
              loading="lazy"
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/[0.03]" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="text-[15px] font-semibold text-gray-900 group-hover:text-sage-700 transition-colors tracking-tight">
              {name}
            </h4>
            <span className="flex-1 border-b border-dotted border-sage-200/40 translate-y-[-2px] min-w-[20px]" />
            <span className="text-[15px] font-bold text-sage-600 whitespace-nowrap tracking-tight tabular-nums">
              {formatPrice(item.price, isArabic)}
            </span>
          </div>
          {desc && (
            <p className="mt-1 text-[13px] text-gray-400 leading-relaxed line-clamp-2">
              {desc}
            </p>
          )}
        </div>
      </div>
      {!isLast && (
        <div className="border-b border-sage-100/30 mx-4" />
      )}
    </div>
  )
}

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
            className="rounded-xl bg-sage-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-sage-600 hover:shadow-lg hover:shadow-sage-500/20 active:scale-95"
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
          <h2 className="text-3xl font-bold text-sage-800 md:text-4xl tracking-tight">{t('menu.title')}</h2>
          <p className="mt-6 text-lg text-gray-500">{t('menu.empty')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-16 md:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{ backgroundImage: `url(${sagePattern})`, backgroundSize: '300px' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl px-6">
        <div className="text-center mb-12">
          <span className="inline-block text-[11px] font-medium tracking-[0.2em] uppercase text-sage-500/70 mb-3">
            {isArabic ? 'اكتشف' : 'Discover'}
          </span>
          <h2 className="text-3xl font-bold text-sage-800 md:text-4xl tracking-tight">
            {t('menu.title')}
          </h2>
          <div className="mt-4 mx-auto w-12 h-0.5 bg-gradient-to-r from-transparent via-sage-400 to-transparent" />
        </div>

        <nav
          className="sticky top-0 z-30 -mx-6 mb-14 overflow-x-auto px-6 py-3 backdrop-blur-md"
          style={{
            WebkitOverflowScrolling: 'touch',
            backgroundColor: 'color-mix(in srgb, var(--color-sage-100) 30%, white)',
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
                  className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 min-h-[40px] ${
                    isActive
                      ? 'bg-sage-500 text-white shadow-md shadow-sage-500/25 scale-[1.02]'
                      : 'bg-white/70 text-sage-700 ring-1 ring-sage-200/60 hover:bg-sage-50 hover:ring-sage-300 hover:scale-[1.01]'
                  }`}
                >
                  {isArabic ? cat.name_ar : cat.name_en}
                </button>
              )
            })}
          </div>
        </nav>

        {categories!.map((cat) => {
          const catItems = groupedItems.get(cat.id) ?? []
          return (
            <section
              key={cat.id}
              id={`category-${cat.id}`}
              data-category-id={cat.id}
              className="mb-16 scroll-mt-28"
            >
              <div className="mb-6 flex items-center gap-4">
                <h3 className="shrink-0 text-lg font-bold text-sage-700 tracking-wide">
                  {isArabic ? cat.name_ar : cat.name_en}
                </h3>
                <div className="flex-1 h-px bg-gradient-to-l from-sage-200/60 to-transparent" />
              </div>

              {catItems.length === 0 ? (
                <p className="py-8 text-center text-gray-400 text-sm">
                  {isArabic ? 'لا توجد منتجات في هذا القسم' : 'No items in this category'}
                </p>
              ) : (
                <div>
                  {catItems.map((item, idx) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      isArabic={isArabic}
                      isLast={idx === catItems.length - 1}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}

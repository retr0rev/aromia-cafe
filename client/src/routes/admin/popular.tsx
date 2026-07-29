import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

interface Item {
  id: number
  category_id: number
  name_ar: string
  name_en: string
  ingredients_ar: string
  ingredients_en: string
  price: number
  image_path: string | null
  is_popular: number
  sort_order: number
  created_at: string
  updated_at: string
}

interface PopularItem extends Item {
  category_name_ar: string
  category_name_en: string
}

type ApiError = { error: string }

const MAX_POPULAR = 4

function handleAuthError(res: Response): void {
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/admin/login'
  }
}

async function fetchAllItems(): Promise<Item[]> {
  const res = await fetch('/api/items')
  if (!res.ok) {
    const err: ApiError = await res.json()
    throw new Error(err.error || 'فشل تحميل المنتجات')
  }
  return res.json()
}

async function fetchPopular(): Promise<PopularItem[]> {
  const res = await fetch('/api/popular')
  if (!res.ok) {
    const err: ApiError = await res.json()
    throw new Error(err.error || 'فشل تحميل المميزة')
  }
  return res.json()
}

async function savePopular(itemIds: number[]): Promise<{ message: string; item_ids: number[] }> {
  const token = localStorage.getItem('token')
  const res = await fetch('/api/popular', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ item_ids: itemIds }),
  })
  if (!res.ok) {
    handleAuthError(res)
    const err: ApiError = await res.json()
    throw new Error(err.error || 'فشل حفظ التغييرات')
  }
  return res.json()
}

function PopularPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number[]>([])
  const [initialized, setInitialized] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: fetchAllItems,
    staleTime: 30_000,
  })

  const popularQuery = useQuery({
    queryKey: ['popular'],
    queryFn: fetchPopular,
    staleTime: 30_000,
  })

  // Initialize selection from currently popular items once data loads
  useEffect(() => {
    if (!initialized && popularQuery.data) {
      setSelected(popularQuery.data.map((item) => item.id))
      setInitialized(true)
    }
  }, [popularQuery.data, initialized])

  const saveMutation = useMutation({
    mutationFn: savePopular,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['popular'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setFeedback({ type: 'success', text: `تم حفظ ${data.item_ids.length} أطباق مميزة` })
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', text: error.message })
      setTimeout(() => setFeedback(null), 6000)
    },
  })

  const handleToggle = useCallback(
    (itemId: number) => {
      setSelected((prev) => {
        if (prev.includes(itemId)) {
          return prev.filter((id) => id !== itemId)
        }
        if (prev.length >= MAX_POPULAR) {
          return prev
        }
        return [...prev, itemId]
      })
    },
    [],
  )

  const handleSave = useCallback(() => {
    saveMutation.mutate(selected)
  }, [selected, saveMutation])

  const isLoading = itemsQuery.isLoading || popularQuery.isLoading
  const isError = itemsQuery.isError || popularQuery.isError
  const errorMessage = (itemsQuery.error as Error)?.message || (popularQuery.error as Error)?.message

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-400 text-lg">جارٍ تحميل المنتجات...</p>
      </div>
    )
  }

  if (isError || !itemsQuery.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-red-500 text-lg">خطأ: {errorMessage || 'حدث خطأ غير متوقع'}</p>
      </div>
    )
  }

  const items = itemsQuery.data
  const popularIds = popularQuery.data?.map((i) => i.id) ?? []

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الأطباق الأكثر شهرة</h1>
        <p className="mt-1 text-sm text-gray-500">
          اختر حتى {MAX_POPULAR} أطباق لتظهر في قسم الأكثر شهرة بالقائمة الرئيسية
        </p>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div
          className={[
            'px-4 py-3 rounded-lg text-sm font-medium',
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200',
          ].join(' ')}
        >
          {feedback.text}
        </div>
      )}

      {/* Current popular items */}
      {popularQuery.data && popularQuery.data.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            الأطباق المميزة حالياً
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularQuery.data.map((item) => (
              <div
                key={item.id}
                className="bg-sage-500/5 rounded-lg border border-sage-500/20 p-3 flex items-center gap-3"
              >
                {item.image_path ? (
                  <img
                    src={item.image_path}
                    alt={item.name_ar}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-gray-300"
                    >
                      <rect x="2" y="2" width="16" height="16" rx="3" />
                      <circle cx="7" cy="7" r="2" />
                      <path d="M2 14l4-4 3 3 4-4 5 5" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name_ar}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.category_name_ar}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All items grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            جميع الأطباق
          </h2>
          <span className="text-sm text-gray-400">
            {selected.length}/{MAX_POPULAR} مختار
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-lg border border-gray-100">
            <p className="text-gray-400">لا توجد منتجات. أضف منتجات أولاً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const isChecked = selected.includes(item.id)
              const isDisabled = !isChecked && selected.length >= MAX_POPULAR
              const wasPopular = popularIds.includes(item.id)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (isDisabled ? undefined : handleToggle(item.id))}
                  disabled={isDisabled}
                  className={[
                    'flex items-center gap-4 p-4 rounded-lg border transition-all duration-150',
                    'text-start',
                    'focus:outline-none focus:ring-2 focus:ring-sage-500/30',
                    isChecked
                      ? 'bg-sage-500/5 border-sage-500/40 ring-1 ring-sage-500/20'
                      : isDisabled
                        ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm',
                  ].join(' ')}
                >
                  {/* Item image */}
                  {item.image_path ? (
                    <img
                      src={item.image_path}
                      alt={item.name_ar}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-gray-300"
                      >
                        <rect x="2" y="2" width="16" height="16" rx="3" />
                        <circle cx="7" cy="7" r="2" />
                        <path d="M2 14l4-4 3 3 4-4 5 5" />
                      </svg>
                    </div>
                  )}

                  {/* Item info */}
                  <div className="flex-1 min-w-0 text-start">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name_ar}
                      </p>
                      {wasPopular && (
                        <span className="shrink-0 text-[10px] font-medium text-sage-500 bg-sage-500/10 px-1.5 py-0.5 rounded">
                          حالي
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.price.toLocaleString()} ل.س
                    </p>
                  </div>

                  {/* Checkbox indicator */}
                  <div
                    className={[
                      'w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
                      isChecked
                        ? 'bg-sage-500 border-sage-500'
                        : 'border-gray-300',
                    ].join(' ')}
                  >
                    {isChecked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-white"
                      >
                        <path d="M5 10l3.5 3.5L15 7" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Save button */}
      <div className="flex justify-start pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className={[
            'px-6 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-sage-500/30',
            saveMutation.isPending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-sage-500 text-white hover:bg-sage-600',
          ].join(' ')}
        >
          {saveMutation.isPending ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              جارٍ الحفظ...
            </span>
          ) : (
            'حفظ التغييرات'
          )}
        </button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/popular')({
  component: PopularPage,
})

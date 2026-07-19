import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Category {
  id: number
  name_ar: string
  name_en: string
  sort_order: number
  created_at: string
  updated_at: string
}

interface Item {
  id: number
  category_id: number
}

interface CategoryForm {
  name_ar: string
  name_en: string
  sort_order: number
}

interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...options, headers })
}

async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch('/api/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchItems(): Promise<Item[]> {
  const res = await apiFetch('/api/items')
  if (!res.ok) throw new Error('Failed to fetch items')
  return res.json()
}

async function createCategory(data: CategoryForm): Promise<Category> {
  const res = await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'فشل إنشاء الصنف')
  }
  return res.json()
}

async function updateCategory(id: number, data: Partial<CategoryForm>): Promise<Category> {
  const res = await apiFetch(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'فشل تحديث الصنف')
  }
  return res.json()
}

async function deleteCategory(id: number): Promise<void> {
  const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('فشل حذف الصنف')
}

function emptyForm(): CategoryForm {
  return { name_ar: '', name_en: '', sort_order: 0 }
}

function CategoriesPage() {
  const queryClient = useQueryClient()

  const { data: categories, isLoading, isError, error } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const { data: items } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: fetchItems,
  })

  const itemCounts = new Map<number, number>()
  if (items) {
    for (const item of items) {
      itemCounts.set(item.category_id, (itemCounts.get(item.category_id) ?? 0) + 1)
    }
  }

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setStatusMessage({ type: 'success', text: 'تم إنشاء الصنف بنجاح' })
      setAddModalOpen(false)
    },
    onError: (err: Error) => setStatusMessage({ type: 'error', text: `خطأ: ${err.message}` }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryForm> }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setStatusMessage({ type: 'success', text: 'تم تحديث الصنف بنجاح' })
      setEditingCategory(null)
    },
    onError: (err: Error) => setStatusMessage({ type: 'error', text: `خطأ: ${err.message}` }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setStatusMessage({ type: 'success', text: 'تم حذف الصنف بنجاح' })
      setDeletingCategory(null)
    },
    onError: (err: Error) => setStatusMessage({ type: 'error', text: `خطأ: ${err.message}` }),
  })

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm())

  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (statusMessage) {
      statusTimer.current = setTimeout(() => setStatusMessage(null), 5000)
    }
    return () => clearTimeout(statusTimer.current)
  }, [statusMessage])

  const openAddModal = useCallback(() => { setForm(emptyForm()); setAddModalOpen(true) }, [])
  const openEditModal = useCallback((cat: Category) => {
    setForm({ name_ar: cat.name_ar, name_en: cat.name_en, sort_order: cat.sort_order })
    setEditingCategory(cat)
  }, [])
  const closeModal = useCallback(() => { setAddModalOpen(false); setEditingCategory(null) }, [])

  const handleSave = useCallback(() => {
    if (editingCategory) updateMutation.mutate({ id: editingCategory.id, data: form })
    else createMutation.mutate(form)
  }, [editingCategory, form, createMutation, updateMutation])

  const handleDelete = useCallback(() => {
    if (deletingCategory) deleteMutation.mutate(deletingCategory.id)
  }, [deletingCategory, deleteMutation])

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isDeleting = deleteMutation.isPending

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400">جارٍ تحميل الأصناف...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-red-500 text-lg font-bold">حدث خطأ</p>
          <p className="text-gray-500">{(error as Error)?.message || 'تعذر تحميل الأصناف'}</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['categories'] })} className="mt-2 px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors">
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {statusMessage && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة الأصناف</h1>
        <button onClick={openAddModal} className="px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors">
          + إضافة صنف
        </button>
      </div>

      {categories && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-gray-200">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-gray-300 mb-4">
            <path d="M6 12h36l-4 28H10L6 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 12V8a4 4 0 014-4h8a4 4 0 014 4v4" stroke="currentColor" strokeWidth="2" />
            <circle cx="17" cy="24" r="2" fill="currentColor" />
            <circle cx="24" cy="24" r="2" fill="currentColor" />
            <circle cx="31" cy="24" r="2" fill="currentColor" />
          </svg>
          <p className="text-gray-500 text-lg mb-2">لا توجد أصناف بعد</p>
          <p className="text-gray-400 text-sm mb-6">أضف أول صنف للبدء</p>
          <button onClick={openAddModal} className="px-4 py-2 bg-sage-500 text-white rounded-lg text-sm font-medium hover:bg-sage-600 transition-colors">
            + إضافة صنف
          </button>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-0 md:bg-white md:rounded-lg md:border md:border-gray-200 md:overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 font-medium text-gray-600">الاسم (عربي)</th>
                  <th className="px-4 py-3 font-medium text-gray-600">الاسم (إنجليزي)</th>
                  <th className="px-4 py-3 font-medium text-gray-600">الترتيب</th>
                  <th className="px-4 py-3 font-medium text-gray-600">عدد المنتجات</th>
                  <th className="px-4 py-3 font-medium text-gray-600 w-32">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories?.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name_ar}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.name_en}</td>
                    <td className="px-4 py-3 text-gray-600">{cat.sort_order}</td>
                    <td className="px-4 py-3 text-gray-600">{itemCounts.get(cat.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(cat)} className="px-3 py-1.5 text-xs font-medium text-sage-500 hover:bg-sage-500/10 rounded-md transition-colors">تعديل</button>
                        <button onClick={() => setDeletingCategory(cat)} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {categories?.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900">{cat.name_ar}</span>
                  <span className="text-xs text-gray-400">{cat.name_en}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500">الترتيب:</span>
                  <span className="text-gray-900">{cat.sort_order}</span>
                  <span className="text-gray-500">عدد المنتجات:</span>
                  <span className="text-gray-900">{itemCounts.get(cat.id) ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => openEditModal(cat)} className="flex-1 py-2 text-sm font-medium text-sage-500 bg-sage-500/5 hover:bg-sage-500/10 rounded-lg transition-colors">تعديل</button>
                  <button onClick={() => setDeletingCategory(cat)} className="flex-1 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(addModalOpen || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} aria-hidden="true" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingCategory ? 'تعديل الصنف' : 'إضافة صنف جديد'}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name_ar" className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية <span className="text-red-500">*</span></label>
                <input id="name_ar" type="text" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="مثال: مشروبات ساخنة" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500 transition-colors" autoFocus />
              </div>
              <div>
                <label htmlFor="name_en" className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية <span className="text-red-500">*</span></label>
                <input id="name_en" type="text" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="e.g. Hot Drinks" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500 transition-colors" dir="ltr" />
              </div>
              <div>
                <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-1">ترتيب العرض</label>
                <input id="sort_order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500 transition-colors" dir="ltr" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">إلغاء</button>
              <button onClick={handleSave} disabled={isSaving || !form.name_ar.trim() || !form.name_en.trim()} className="px-4 py-2 text-sm font-medium text-white bg-sage-500 hover:bg-sage-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingCategory(null)} aria-hidden="true" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2"><path d="M5 5l10 10M15 5L5 15" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">حذف الصنف</h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">هل أنت متأكد من حذف صنف <span className="font-bold text-gray-900">{deletingCategory.name_ar}</span>؟</p>
            <p className="text-sm text-red-600 font-medium mb-6">يتم حذف جميع المنتجات في هذا الصنف</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeletingCategory(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">إلغاء</button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/admin/categories')({ component: CategoriesPage })

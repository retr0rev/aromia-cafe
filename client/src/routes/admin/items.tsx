import { createFileRoute } from '@tanstack/react-router'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useRef, useState, type DragEvent } from 'react'

// ── Types ─────────────────────────────────────────────────────────────
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
  is_popular: number
  sort_order: number
}

interface ItemFormData {
  category_id: string
  name_ar: string
  name_en: string
  ingredients_ar: string
  ingredients_en: string
  price: string
  sort_order: string
}

const EMPTY_FORM: ItemFormData = {
  category_id: '',
  name_ar: '',
  name_en: '',
  ingredients_ar: '',
  ingredients_en: '',
  price: '',
  sort_order: '0',
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

// ── API helpers ───────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function handleAuthError(res: Response): void {
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/admin/login'
  }
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchItems(categoryId?: number): Promise<Item[]> {
  const url = categoryId
    ? `/api/items?category_id=${categoryId}`
    : '/api/items'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch items')
  return res.json()
}

async function createItem(data: Record<string, unknown>): Promise<Item> {
  const res = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    handleAuthError(res)
    const err = await res.json().catch(() => ({ error: 'فشل إنشاء المنتج' }))
    throw new Error(err.error)
  }
  return res.json()
}

async function updateItem(id: number, data: Record<string, unknown>): Promise<Item> {
  const res = await fetch(`/api/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    handleAuthError(res)
    const err = await res.json().catch(() => ({ error: 'فشل تحديث المنتج' }))
    throw new Error(err.error)
  }
  return res.json()
}

async function deleteItem(id: number): Promise<void> {
  const res = await fetch(`/api/items/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    handleAuthError(res)
    const err = await res.json().catch(() => ({ error: 'فشل حذف المنتج' }))
    throw new Error(err.error)
  }
}

// ── SVG icons (inline for zero dependency) ────────────────────────────
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3v10M3 8h10" />
  </svg>
)

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 2l3 3-9 9H2v-3l9-9z" />
  </svg>
)

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
  </svg>
)

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5M12 3v12" />
  </svg>
)

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" stroke="none">
    <path d="M7 0l1.7 5.2h5.5L9.7 8.3 11.4 13.5 7 10.4l-4.4 3.1L4.3 8.3.8 5.2h5.5z" />
  </svg>
)

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4l10 10M14 4L4 14" />
  </svg>
)

// ── Image upload drop zone ────────────────────────────────────────────
function ImageUpload({
  imagePreview,
  currentImagePath,
  onFileSelect,
  onClear,
  error,
}: {
  imagePreview: string | null
  currentImagePath: string | null
  onFileSelect: (file: File) => void
  onClear: () => void
  error: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const validate = useCallback(
    (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return 'يجب أن يكون الملف صورة (JPG, PNG, WEBP)'
      }
      if (file.size > MAX_SIZE) {
        return 'حجم الملف يجب أن يكون أقل من 5 ميغابايت'
      }
      return null
    },
    [],
  )

  function handleFile(file: File) {
    const validationError = validate(file)
    if (validationError) {
      onFileSelect(file) // will still reject but show error
      return
    }
    onFileSelect(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const previewSrc = imagePreview ?? (currentImagePath ?? null)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        صورة المنتج
      </label>

      {previewSrc ? (
        <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={previewSrc}
            alt="معاينة الصورة"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 end-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            title="إزالة الصورة"
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'w-40 h-40 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
            dragging
              ? 'border-sage-500 bg-sage-500/5'
              : 'border-gray-300 hover:border-sage-500 hover:bg-gray-50',
          ].join(' ')}
        >
          <UploadIcon />
          <span className="text-xs text-gray-500 text-center px-2">
            اسحب الصورة هنا
            <br />
            أو اضغط للاختيار
          </span>
          <span className="text-[10px] text-gray-400">JPG, PNG, WEBP (5MB)</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────────
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  loading: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'جارٍ الحذف...' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page component ───────────────────────────────────────────────
function ItemsPage() {
  const queryClient = useQueryClient()

  // State
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [form, setForm] = useState<ItemFormData>(EMPTY_FORM)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Queries
  const {
    data: categories = [],
    isLoading: catsLoading,
    isError: catsError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch,
  } = useQuery({
    queryKey: ['items', categoryFilter],
    queryFn: () =>
      fetchItems(categoryFilter ? Number(categoryFilter) : undefined),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setDeleteTarget(null)
      setDeleting(false)
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────
  function getCategoryName(categoryId: number): string {
    const cat = categories.find((c) => c.id === categoryId)
    return cat ? cat.name_ar : `#${categoryId}`
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setImageBase64(null)
    setImagePreview(null)
    setImageError(null)
    setFormError(null)
    setEditingItem(null)
    setSubmitting(false)
  }

  function openAddModal() {
    resetForm()
    setModalOpen(true)
  }

  function openEditModal(item: Item) {
    setEditingItem(item)
    setForm({
      category_id: String(item.category_id),
      name_ar: item.name_ar,
      name_en: item.name_en,
      ingredients_ar: item.ingredients_ar,
      ingredients_en: item.ingredients_en,
      price: String(item.price),
      sort_order: String(item.sort_order),
    })
    setImageBase64(null)
    setImagePreview(null)
    setImageError(null)
    setFormError(null)
    setSubmitting(false)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  function handleImageSelect(file: File) {
    const isImage = ALLOWED_TYPES.includes(file.type)
    const isSmall = file.size <= MAX_SIZE

    if (!isImage) {
      setImageError('يجب أن يكون الملف صورة (JPG, PNG, WEBP)')
      return
    }
    if (!isSmall) {
      setImageError('حجم الملف يجب أن يكون أقل من 5 ميغابايت')
      return
    }

    setImageError(null)

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setImageBase64(base64)
      setImagePreview(base64)
    }
    reader.readAsDataURL(file)
  }

  function handleImageClear() {
    setImageBase64(null)
    setImagePreview(null)
    setImageError(null)
  }

  function handleFormChange(
    field: keyof ItemFormData,
    value: string,
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    // Client-side validation
    if (!form.category_id) {
      setFormError('يرجى اختيار التصنيف')
      return
    }
    if (!form.name_ar.trim()) {
      setFormError('الاسم العربي مطلوب')
      return
    }
    if (!form.name_en.trim()) {
      setFormError('الاسم الإنكليزي مطلوب')
      return
    }
    if (!form.price || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      setFormError('السعر يجب أن يكون رقماً صحيحاً غير سالب')
      return
    }
    // Image required for new items
    if (!editingItem && !imageBase64) {
      setFormError('يرجى رفع صورة للمنتج')
      return
    }

    setSubmitting(true)

    const data: Record<string, unknown> = {
      category_id: Number(form.category_id),
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      ingredients_ar: form.ingredients_ar,
      ingredients_en: form.ingredients_en,
      price: Number(form.price),
      sort_order: Number(form.sort_order || '0'),
    }

    if (imageBase64) {
      data.image_path = imageBase64
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
    } catch {
      setDeleting(false)
    }
  }

  const isModalAdd = !editingItem
  const mutationError =
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المنتجات</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة المنتجات والتحكم بالأسعار والصور
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sage-500 text-white text-sm font-medium rounded-lg hover:bg-sage-600 transition-colors shadow-sm"
        >
          <PlusIcon />
          إضافة منتج
        </button>
      </div>

      {/* Mutation error banner */}
      {mutationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {mutationError}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
        >
          <option value="">جميع التصنيفات</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name_ar}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {itemsLoading || catsLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
          <span className="ms-3 text-gray-500 text-sm">جارٍ التحميل...</span>
        </div>
      ) : catsError || itemsError ? (
        /* Error state */
        <div className="text-center py-20">
          <p className="text-red-500 text-lg">حدث خطأ</p>
          <p className="text-gray-400 text-sm mt-1">
            تعذر تحميل البيانات
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-sage-500 hover:bg-sage-600 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">لا توجد منتجات</p>
          <p className="text-gray-400 text-sm mt-1">
            {categoryFilter
              ? 'لا توجد منتجات في هذا التصنيف'
              : 'اضغط على "إضافة منتج" لإضافة منتج جديد'}
          </p>
        </div>
      ) : (
        /* Items list */
        <div className="space-y-3 md:space-y-0 md:bg-white md:rounded-xl md:border md:border-gray-200 md:overflow-hidden">
          {/* Table header - hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-1">الصورة</div>
            <div className="col-span-3">الاسم</div>
            <div className="col-span-2">التصنيف</div>
            <div className="col-span-2">السعر</div>
            <div className="col-span-2">الترتيب</div>
            <div className="col-span-2 text-center">إجراءات</div>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 md:border-0 md:rounded-none grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 md:border-b md:border-gray-50 md:last:border-b-0 items-center hover:bg-gray-50/50 transition-colors"
            >
              {/* Mobile header row */}
              <div className="md:hidden flex items-center gap-3">
                {/* Thumbnail */}
                <div className="shrink-0">
                  {item.image_path ? (
                    <img
                      src={item.image_path}
                      alt={item.name_ar}
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name + popular badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-gray-900">{item.name_ar}</span>
                    {item.is_popular === 1 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium shrink-0">
                        <StarIcon />
                        مميز
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{item.name_en}</span>
                </div>
              </div>

              {/* Mobile detail rows */}
              <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-gray-500">التصنيف:</span>
                <span className="text-gray-900 font-medium">{getCategoryName(item.category_id)}</span>

                <span className="text-gray-500">السعر:</span>
                <span className="text-gray-900 font-medium font-mono">
                  {item.price.toLocaleString('ar-SY')} ل.س
                </span>

                <span className="text-gray-500">الترتيب:</span>
                <span className="text-gray-900">{item.sort_order}</span>
              </div>

              {/* Desktop: Thumbnail */}
              <div className="hidden md:flex col-span-1 justify-center md:justify-start">
                {item.image_path ? (
                  <img
                    src={item.image_path}
                    alt={item.name_ar}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Desktop: Name */}
              <div className="hidden md:block col-span-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {item.name_ar}
                  </span>
                  {item.is_popular === 1 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                      <StarIcon />
                      مميز
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{item.name_en}</span>
              </div>

              {/* Desktop: Category */}
              <div className="hidden md:block col-span-2">
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {getCategoryName(item.category_id)}
                </span>
              </div>

              {/* Desktop: Price */}
              <div className="hidden md:block col-span-2">
                <span className="text-sm font-semibold text-gray-900 font-mono">
                  {item.price.toLocaleString('ar-SY')} ل.س
                </span>
              </div>

              {/* Desktop: Sort order */}
              <div className="hidden md:block col-span-2">
                <span className="text-xs text-gray-500">{item.sort_order}</span>
              </div>

              {/* Actions (both mobile and desktop) */}
              <div className="flex items-center justify-end md:justify-center gap-1 col-span-1 md:col-span-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-2.5 md:p-2 text-gray-400 hover:text-sage-500 hover:bg-sage-500/10 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="p-2.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="حذف"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit modal ─────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isModalAdd ? 'إضافة منتج' : 'تعديل المنتج'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form error */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {formError}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              التصنيف *
            </label>
            <select
              value={form.category_id}
              onChange={(e) => handleFormChange('category_id', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
              >
                <option value="">اختر التصنيف...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_ar} ({cat.name_en})
                </option>
              ))}
            </select>
          </div>

          {/* Name AR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم بالعربية *
            </label>
            <input
              type="text"
              value={form.name_ar}
              onChange={(e) => handleFormChange('name_ar', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
              dir="rtl"
            />
          </div>

          {/* Name EN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم بالإنكليزية *
            </label>
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => handleFormChange('name_en', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
              dir="ltr"
            />
          </div>

          {/* Ingredients AR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المكونات بالعربية
            </label>
            <textarea
              value={form.ingredients_ar}
              onChange={(e) => handleFormChange('ingredients_ar', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
              dir="rtl"
            />
          </div>

          {/* Ingredients EN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المكونات بالإنكليزية
            </label>
            <textarea
              value={form.ingredients_en}
              onChange={(e) => handleFormChange('ingredients_en', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
              dir="ltr"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              السعر (ل.س) *
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => handleFormChange('price', e.target.value)}
              required
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
            />
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ترتيب الظهور
            </label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => handleFormChange('sort_order', e.target.value)}
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sage-500/30 focus:border-sage-500"
            />
          </div>

          {/* Image upload */}
          <ImageUpload
            imagePreview={imagePreview}
            currentImagePath={editingItem?.image_path ?? null}
            onFileSelect={handleImageSelect}
            onClear={handleImageClear}
            error={imageError}
          />

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-sm font-medium text-white bg-sage-500 hover:bg-sage-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting
                ? 'جارٍ الحفظ...'
                : isModalAdd
                  ? 'إضافة'
                  : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirmation ──────────────────────────────────── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="تأكيد الحذف"
        message={
          deleteTarget
            ? `هل أنت متأكد من حذف "${deleteTarget.name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : ''
        }
        loading={deleting}
      />
    </div>
  )
}

export const Route = createFileRoute('/admin/items')({
  component: ItemsPage,
})

import { createFileRoute } from '@tanstack/react-router'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

// --- API ---

function handleAuthError(res: Response): void {
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/admin/login'
  }
}

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('Failed to load settings')
  return res.json()
}

async function putSettings(
  data: Record<string, string>,
): Promise<Record<string, string>> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    handleAuthError(res)
    throw new Error('Failed to save settings')
  }
  return res.json()
}

// --- Query Client ---

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
})

// --- Form fields ---

const FIELDS = [
  { key: 'about_ar', label: 'وصف المقهى (عربي)', type: 'textarea' as const },
  { key: 'about_en', label: 'وصف المقهى (إنجليزي)', type: 'textarea' as const },
  { key: 'tagline_ar', label: 'الشعار (عربي)', type: 'input' as const },
  { key: 'tagline_en', label: 'الشعار (إنجليزي)', type: 'input' as const },
  { key: 'address', label: 'العنوان', type: 'input' as const },
  { key: 'phone', label: 'الهاتف', type: 'input' as const },
  { key: 'hours', label: 'ساعات العمل', type: 'input' as const },
  { key: 'instagram', label: 'رابط انستغرام', type: 'input' as const },
  { key: 'facebook', label: 'رابط فيسبوك', type: 'input' as const },
]

// --- Form component ---

function SettingsForm() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')
  const initDone = useRef(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  const mutation = useMutation({
    mutationFn: putSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setToast('تم الحفظ بنجاح')
      setTimeout(() => setToast(''), 3000)
    },
  })

  // Populate form on first data load
  useEffect(() => {
    if (data && !initDone.current) {
      const defaults: Record<string, string> = {}
      for (const f of FIELDS) {
        defaults[f.key] = data[f.key] ?? ''
      }
      setForm(defaults)
      initDone.current = true
    }
  }, [data])

  const handleChange = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      mutation.mutate(form)
    },
    [form, mutation],
  )

  // --- Loading state ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">جارٍ تحميل الإعدادات...</p>
      </div>
    )
  }

  // --- Error state ---

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">حدث خطأ في تحميل الإعدادات</p>
      </div>
    )
  }

  // --- Styles ---

  const inputCls = [
    'w-full px-4 py-2.5 rounded-lg border border-gray-200',
    'focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20',
    'outline-none transition-colors',
    'placeholder:text-gray-400',
  ].join(' ')

  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

  // --- Render ---

  return (
    <div className="max-w-2xl">
      {/* Success toast */}
      {toast && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50">
          <div className="px-6 py-3 bg-sage-500 text-white rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className={labelCls}>
                {f.label}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  id={f.key}
                  value={form[f.key] ?? ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className={`${inputCls} min-h-[100px] resize-y`}
                  dir="auto"
                  rows={3}
                />
              ) : (
                <input
                  id={f.key}
                  type="text"
                  value={form[f.key] ?? ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className={inputCls}
                  dir="auto"
                />
              )}
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="flex justify-start">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-8 py-3 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {mutation.isPending ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  )
}

// --- Password change component ---

function PasswordChangeForm() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (form.newPassword !== form.confirmPassword) {
      setMsg({ type: 'error', text: 'كلمة المرور الجديدة غير متطابقة' })
      return
    }
    if (form.newPassword.length < 8) {
      setMsg({ type: 'error', text: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      handleAuthError(res)
      const data = await res.json()

      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'حدث خطأ' })
        return
      }

      setMsg({ type: 'success', text: data.message || 'تم تغيير كلمة المرور بنجاح' })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setMsg({ type: 'error', text: 'حدث خطأ في الاتصال' })
    } finally {
      setLoading(false)
    }
  }, [form])

  const inputCls = [
    'w-full px-4 py-2.5 rounded-lg border border-gray-200',
    'focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20',
    'outline-none transition-colors',
    'placeholder:text-gray-400',
  ].join(' ')

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">تغيير كلمة المرور</h2>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          msg.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور الحالية</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور الجديدة</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className={inputCls}
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className={inputCls}
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
        </button>
      </form>
    </div>
  )
}

// --- Route component ---

function SettingsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 w-full max-w-2xl">الإعدادات</h1>
        <div className="w-full max-w-2xl space-y-6">
          <SettingsForm />
          <PasswordChangeForm />
        </div>
      </div>
    </QueryClientProvider>
  )
}

export const Route = createFileRoute('/admin/settings')({
  component: SettingsPage,
})

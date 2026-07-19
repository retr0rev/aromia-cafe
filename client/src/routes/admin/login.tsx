import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import sageLogo from '@/assets/brand/logos/sage-green/Logo - Aromia-01.png'

interface LoginResponse {
  token: string
}

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // On mount: check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          navigate({ to: '/admin', replace: true })
        } else {
          localStorage.removeItem('token')
          setLoading(false)
        }
      })
      .catch(() => {
        localStorage.removeItem('token')
        setLoading(false)
      })
  }, [navigate])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!username.trim() || !password.trim()) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        return
      }

      setSubmitting(true)

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        })

        if (!res.ok) {
          setError('اسم المستخدم أو كلمة المرور غير صحيحة')
          setSubmitting(false)
          return
        }

        const data: LoginResponse = await res.json()
        localStorage.setItem('token', data.token)
        navigate({ to: '/admin', replace: true })
      } catch {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        setSubmitting(false)
      }
    },
    [username, password, navigate],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={sageLogo}
            alt="أرومية"
            className="h-16 w-auto object-contain"
          />
        </div>

          <h1 className="text-xl font-bold text-center text-sage-500 mb-6">
          تسجيل الدخول
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              اسم المستخدم
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 outline-none transition-colors"
              placeholder="أدخل اسم المستخدم"
              dir="auto"
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 outline-none transition-colors"
              placeholder="أدخل كلمة المرور"
              dir="auto"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/login')({
  component: LoginPage,
})

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

function AccountPage() {
  const navigate = useNavigate()

  const [usernameForm, setUsernameForm] = useState({ newUsername: '', password: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handleUsernameChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setUsernameMsg(null)
    setUsernameLoading(true)

    try {
      const res = await apiFetch('/api/auth/username', {
        method: 'PUT',
        body: JSON.stringify(usernameForm),
      })
      const data = await res.json()

      if (!res.ok) {
        setUsernameMsg({ type: 'error', text: data.error || 'حدث خطأ' })
        return
      }

      localStorage.setItem('token', data.token)
      setUsernameMsg({ type: 'success', text: data.message })
      setUsernameForm({ newUsername: '', password: '' })
    } catch {
      setUsernameMsg({ type: 'error', text: 'حدث خطأ في الاتصال' })
    } finally {
      setUsernameLoading(false)
    }
  }, [usernameForm])

  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'كلمة المرور الجديدة غير متطابقة' })
      return
    }

    setPasswordLoading(true)

    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setPasswordMsg({ type: 'error', text: data.error || 'حدث خطأ' })
        return
      }

      setPasswordMsg({ type: 'success', text: data.message })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setPasswordMsg({ type: 'error', text: 'حدث خطأ في الاتصال' })
    } finally {
      setPasswordLoading(false)
    }
  }, [passwordForm])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">إعدادات الحساب</h1>

      {/* Change Username */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">تغيير اسم المستخدم</h2>

        {usernameMsg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            usernameMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {usernameMsg.text}
          </div>
        )}

        <form onSubmit={handleUsernameChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم الجديد</label>
            <input
              type="text"
              value={usernameForm.newUsername}
              onChange={(e) => setUsernameForm({ ...usernameForm, newUsername: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 outline-none transition-colors"
              required
              minLength={3}
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية (للتأكيد)</label>
            <input
              type="password"
              value={usernameForm.password}
              onChange={(e) => setUsernameForm({ ...usernameForm, password: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 outline-none transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={usernameLoading}
            className="px-6 py-2.5 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {usernameLoading ? 'جاري الحفظ...' : 'تغيير اسم المستخدم'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">تغيير كلمة المرور</h2>

        {passwordMsg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            passwordMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 outline-none transition-colors"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 outline-none transition-colors"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="px-6 py-2.5 bg-sage-500 text-white rounded-lg hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {passwordLoading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            localStorage.removeItem('token')
            navigate({ to: '/admin/login', replace: true })
          }}
          className="px-6 py-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-200"
        >
          تسجيل خروج
        </button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/account')({ component: AccountPage })

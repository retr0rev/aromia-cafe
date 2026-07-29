import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

function useRequireAuth() {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate({ to: '/admin/login', replace: true })
      return
    }
    fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('unauthorized')
        setAuthed(true)
      })
      .catch(() => {
        localStorage.removeItem('token')
        navigate({ to: '/admin/login', replace: true })
      })
  }, [navigate])

  return authed
}

const CARDS = [
  { to: '/admin/categories', label: 'الأصناف', desc: 'إدارة أصناف المنيو', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { to: '/admin/items', label: 'المنتجات', desc: 'إدارة المنتجات والأسعار', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { to: '/admin/popular', label: 'الأكثر شهرة', desc: 'اختيار المنتجات الأكثر شهرة', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { to: '/admin/settings', label: 'الإعدادات', desc: 'معلومات المقهى والتواصل', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

function AdminDashboard() {
  const navigate = useNavigate()
  const authed = useRequireAuth()

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    navigate({ to: '/admin/login', replace: true })
  }, [navigate])

  if (!authed) return null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          تسجيل خروج
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(card => (
          <Link
            key={card.to}
            to={card.to}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-sage-200 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="shrink-0 w-12 h-12 rounded-lg bg-sage-50 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage-500">
                <path d={card.icon} />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{card.label}</h2>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/')({ component: AdminDashboard })

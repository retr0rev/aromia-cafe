import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { Suspense, useCallback, useEffect, useState } from 'react'
import sageLogoIcon from '@/assets/brand/logos/sage-green/Logo - Aromia-03.png'

type AuthState = 'loading' | 'authenticated' | 'unauth'

interface AuthResponse {
  username: string
}

const NAV_ITEMS = [
  { label: 'الأصناف', to: '/admin/categories' },
  { label: 'المنتجات', to: '/admin/items' },
  { label: 'الأكثر شهرة', to: '/admin/popular' },
  { label: 'الإعدادات', to: '/admin/settings' },
] as const

function AdminLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [username, setUsername] = useState('')

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) {
      setAuthState('authenticated')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setAuthState('unauth')
      navigate({ to: '/admin/login', replace: true })
      return
    }

    setAuthState('loading')

    fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('unauthorized')
        const data: AuthResponse = await res.json()
        setUsername(data.username || 'مدير النظام')
        setAuthState('authenticated')
      })
      .catch(() => {
        localStorage.removeItem('token')
        setAuthState('unauth')
        navigate({ to: '/admin/login', replace: true })
      })
  }, [isLoginPage, navigate])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    navigate({ to: '/admin/login', replace: true })
  }, [navigate])

  if (isLoginPage) {
    return (
      <div dir="rtl" className="font-arabic">
        <Outlet />
      </div>
    )
  }

  if (authState === 'loading') {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-white font-arabic">
        <p className="text-gray-500 text-lg">جارٍ التحميل...</p>
      </div>
    )
  }

  if (authState === 'unauth') {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-white font-arabic">
        <p className="text-gray-500 text-lg">جاري التحويل...</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="flex h-screen overflow-hidden bg-white font-arabic">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed lg:static inset-y-0 start-0 z-50',
          'w-64 flex flex-col shrink-0',
          'bg-white border-e border-gray-200',
          'transform transition-transform duration-200 ease-in-out',
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full rtl:translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <img
              src={sageLogoIcon}
              alt="Aromia"
              className="h-7 w-auto object-contain"
            />
            <span className="text-xl font-bold text-sage-500">أرومية</span>
          </div>
          <button
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700 rounded"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={[
                'block w-full px-4 py-3 rounded-lg text-start min-h-[44px]',
                'transition-colors duration-150',
                'text-sm font-medium',
                pathname === item.to
                    ? 'bg-sage-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <p className="text-sm text-gray-400 truncate text-start">
            {username || 'مدير النظام'}
          </p>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors text-start"
          >
            تسجيل خروج
          </button>
          <Link
            to="/"
            className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-sage-500 hover:bg-sage-50 rounded-lg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4l-4 4 4 4" />
            </svg>
            العودة للموقع
          </Link>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center h-16 shrink-0 px-4 lg:px-6 border-b border-gray-100 bg-white">
          <button
            className="lg:hidden p-3 -ms-3 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5h16M3 11h16M3 17h16" />
            </svg>
          </button>

          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">جارٍ التحميل...</p>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/__layout')({
  component: AdminLayout,
})

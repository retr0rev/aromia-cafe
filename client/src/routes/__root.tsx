import { useTranslation } from 'react-i18next'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Outlet, useRouterState, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

import logoSymbol from '@/assets/brand/logos/sage-green/Logo - Aromia-03.png'
import brandPattern from '@/assets/brand/patterns/sage-green/Pattern - Aromia.png'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
})

/**
 * Decorative SVG illustration for the 404 page — coffee cup with steam.
 */
function NotFoundIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      className="mb-8 text-sage-300"
      aria-hidden="true"
    >
      <ellipse cx="60" cy="92" rx="36" ry="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M30 60v24a4 4 0 004 4h52a4 4 0 004-4V60"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="32" y="56" width="56" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M86 66a8 8 0 008-8v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="46" x2="48" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
      </line>
      <line x1="60" y1="40" x2="60" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
      </line>
      <line x1="70" y1="46" x2="72" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
      </line>
    </svg>
  )
}

/**
 * 404 Not Found — bilingual, branded page with animated coffee motif.
 */
function NotFound() {
  const { t } = useTranslation()

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sage-50 via-white to-sage-50 px-4">
      {/* Background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url(${brandPattern})`,
          backgroundSize: '300px',
          backgroundRepeat: 'repeat',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        <NotFoundIllustration />

        {/* 404 number */}
        <h1
          className="mb-4 text-7xl font-bold tracking-tight text-sage-500 md:text-8xl"
          style={{ fontFamily: "'Caliburn', system-ui, sans-serif" }}
        >
          404
        </h1>

        {/* Title */}
        <h2 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">
          {t('error.notFoundTitle')}
        </h2>

        {/* Description */}
        <p className="mb-10 max-w-md text-center text-base leading-relaxed text-gray-500">
          {t('error.notFoundDescription')}
        </p>

        {/* Go home button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-sage-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sage-500/25 transition-all duration-200 hover:bg-sage-600 hover:shadow-xl hover:shadow-sage-500/30 active:scale-95 min-h-[48px]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>{t('error.goHome')}</span>
        </Link>

        {/* Brand mark */}
        <div className="mt-12 flex items-center gap-2 opacity-30">
          <img src={logoSymbol} alt="" className="h-6 w-6" aria-hidden="true" />
          <span
            className="text-xs font-bold tracking-widest text-sage-500"
            style={{ fontFamily: "'Caliburn', system-ui, sans-serif" }}
          >
            AROMIA
          </span>
        </div>
      </div>
    </main>
  )
}

/**
 * Dynamic page title based on route and language.
 */
function usePageTitle() {
  const { i18n } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const isAr = i18n.language === 'ar'
    const base = isAr ? 'أرومية' : 'Aromia'

    let suffix = ''
    if (pathname === '/admin/login') {
      suffix = isAr ? ' | تسجيل الدخول' : ' | Login'
    } else if (pathname.startsWith('/admin')) {
      suffix = isAr ? ' | لوحة التحكم' : ' | Dashboard'
    }

    document.title = base + suffix
  }, [i18n.language, pathname])
}

function RootLayout() {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  usePageTitle()

  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

  return (
    <QueryClientProvider client={queryClient}>
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`min-h-screen ${isArabic ? 'font-arabic' : 'font-display'}`}
      >
        {!isAdmin && <LanguageSwitcher />}
        <Outlet />
      </div>
    </QueryClientProvider>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})

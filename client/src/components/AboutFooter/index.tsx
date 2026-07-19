import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

const CURRENT_YEAR = new Date().getFullYear()

import patternBg from '@/assets/brand/patterns/sage-green/Pattern - Aromia.png'
import logoImg from '@/assets/brand/logos/sage-green/Logo - Aromia-03.png'

// --- API ---

const SETTINGS_KEY = ['settings'] as const

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('Failed to load settings')
  return res.json()
}

// --- Icons (brand iconography style: clean line icons in Sage Green) ---

function MapPinIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

// --- Contact item (with optional href) ---

function ContactItem({
  icon,
  children,
  href,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-3 text-gray-700 min-h-[44px]">
      <span className="shrink-0 text-sage-500">{icon}</span>
      <span>{children}</span>
    </div>
  )

  if (href) {
    const isExternal = href.startsWith('http')
    return (
      <a
        href={href}
        className="block group hover:text-sage-700 transition-colors"
        {...(isExternal
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {content}
      </a>
    )
  }

  return <div>{content}</div>
}

// --- Skeleton loading state ---

function AboutFooterSkeleton() {
  return (
    <footer className="relative bg-sage-50 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-sage-200" />
      <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4 animate-pulse">
            <div className="h-7 bg-sage-200 rounded w-32" />
            <div className="space-y-2">
              <div className="h-4 bg-sage-200/60 rounded" />
              <div className="h-4 bg-sage-200/60 rounded w-5/6" />
              <div className="h-4 bg-sage-200/60 rounded w-4/6" />
            </div>
          </div>
          <div className="space-y-4 animate-pulse">
            <div className="h-7 bg-sage-200 rounded w-28" />
            <div className="space-y-3">
              <div className="h-4 bg-sage-200/60 rounded w-3/4" />
              <div className="h-4 bg-sage-200/60 rounded w-1/2" />
              <div className="h-4 bg-sage-200/60 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
      <div className="relative border-t border-sage-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-3">
          <div className="h-5 w-5 bg-sage-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-sage-200/60 rounded animate-pulse" />
        </div>
      </div>
    </footer>
  )
}

// --- Error state (minimal footer) ---

function AboutFooterError() {
  const { t } = useTranslation()

  return (
    <footer className="relative bg-sage-50 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sage-400 via-sage-500 to-sage-600" />
      <div className="relative border-t border-sage-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-3">
          <img
            src={logoImg}
            alt="Aromia"
            className="h-5 w-auto opacity-80"
          />
          <span className="text-xs text-gray-500">
            {t('footer.copyright', { year: CURRENT_YEAR })}
          </span>
        </div>
      </div>
    </footer>
  )
}

// --- Main component ---

export function AboutFooter() {
  const { i18n, t } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: fetchSettings,
  })

  const aboutText = useMemo(() => {
    if (!settings) return ''
    return isArabic ? (settings.about_ar ?? '') : (settings.about_en ?? '')
  }, [settings, isArabic])

  if (isError) {
    return <AboutFooterError />
  }

  if (isLoading) {
    return <AboutFooterSkeleton />
  }

  const address = settings?.address ?? ''
  const phone = settings?.phone ?? ''
  const hours = settings?.hours ?? ''
  const instagram = settings?.instagram ?? ''
  const facebook = settings?.facebook ?? ''

  const hasContact = address !== '' || phone !== '' || hours !== ''
  const hasSocials = instagram !== '' || facebook !== ''

  const mapsUrl = address
    ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
    : ''

  return (
    <footer className="relative bg-sage-50 overflow-hidden">
      {/* Brand pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03] bg-repeat bg-[length:300px]"
        style={{ backgroundImage: `url(${patternBg})` }}
        aria-hidden="true"
      />

      {/* Top gradient accent */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sage-400 via-sage-500 to-sage-600" />

      <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid md:grid-cols-2 gap-12">
          {/* About column */}
          <div>
            <h3 className="text-xl font-bold text-sage-700 mb-4">
              {t('about.title')}
            </h3>
            {aboutText ? (
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {aboutText}
              </p>
            ) : (
              <p className="text-gray-400 italic text-sm">
                {isArabic ? 'لا يوجد وصف بعد' : 'No description yet'}
              </p>
            )}
          </div>

          {/* Contact column */}
          <div>
            <h3 className="text-xl font-bold text-sage-700 mb-4">
              {t('footer.contactHeading')}
            </h3>
            {hasContact ? (
              <div className="space-y-4">
                {address && (
                  <ContactItem icon={<MapPinIcon />} href={mapsUrl}>
                    <span className="text-sm text-gray-600">{address}</span>
                  </ContactItem>
                )}
                {phone && (
                  <ContactItem icon={<PhoneIcon />} href={`tel:${phone}`}>
                    <span className="text-sm text-gray-600" dir="ltr">
                      {phone}
                    </span>
                  </ContactItem>
                )}
                {hours && (
                  <ContactItem icon={<ClockIcon />}>
                    <span className="text-sm text-gray-600">{hours}</span>
                  </ContactItem>
                )}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">
                {isArabic
                  ? 'لم تتم إضافة معلومات التواصل بعد'
                  : 'No contact info yet'}
              </p>
            )}
          </div>
        </div>

        {/* Social media row */}
        {hasSocials && (
          <div className="mt-12 pt-8 border-t border-sage-200">
            <p className="text-sm font-medium text-sage-600 mb-4 text-center">
              {t('about.social')}
            </p>
            <div className="flex items-center justify-center gap-4">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-sage-200 text-sage-500 hover:bg-sage-500 hover:text-white hover:border-sage-500 transition-all duration-200"
                  aria-label="Instagram"
                >
                  <InstagramIcon />
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-sage-200 text-sage-500 hover:bg-sage-500 hover:text-white hover:border-sage-500 transition-all duration-200"
                  aria-label="Facebook"
                >
                  <FacebookIcon />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="relative border-t border-sage-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-3">
          <img
            src={logoImg}
            alt="Aromia"
            className="h-5 w-auto opacity-80"
          />
          <span className="text-xs text-gray-500">
            {t('footer.copyright', { year: CURRENT_YEAR })}
          </span>
        </div>
      </div>
    </footer>
  )
}

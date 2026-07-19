import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Language switcher pill button.
 *
 * - Toggles between Arabic (ar) and English (en)
 * - i18n.languageChanged event already handles document.dir and document.lang
 * - LanguageDetector caches preference to localStorage automatically
 * - Uses brand sage green colors
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggle = useCallback(() => {
    const next = i18n.language === 'ar' ? 'en' : 'ar'
    i18n.changeLanguage(next)
  }, [i18n])

  const isArabic = i18n.language === 'ar'

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        'fixed top-4 end-4 z-50',
        'flex items-center justify-center',
        'min-w-[44px] h-11 px-3',
        'text-sm font-semibold tracking-wide uppercase',
        'rounded-full',
        'border border-sage-200',
        'bg-white/90 backdrop-blur-sm',
        'text-sage-600',
        'shadow-sm',
        'hover:bg-sage-50 hover:border-sage-300',
        'active:bg-sage-100',
        'transition-all duration-200 ease-in-out',
        'select-none',
      ].join(' ')}
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      title={isArabic ? 'English' : 'العربية'}
    >
      <span className="relative inline-block min-w-[20px] text-center">
        {isArabic ? 'EN' : 'عربي'}
      </span>
    </button>
  )
}

export default LanguageSwitcher

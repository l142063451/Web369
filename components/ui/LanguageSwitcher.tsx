'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'
import { locales } from '@/i18n'

const languageNames = {
  en: 'English',
  hi: 'हिंदी'
}

export function LanguageSwitcher() {
  const t = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (newLocale: string) => {
    // Remove current locale from pathname and add new locale
    const segments = pathname.split('/')
    segments[1] = newLocale // Replace locale segment
    const newPath = segments.join('/')
    
    router.push(newPath)
    
    // Store locale preference
    localStorage.setItem('preferred-locale', newLocale)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-auto gap-2"
          aria-label={t('language')}
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">
            {languageNames[locale as keyof typeof languageNames] || locale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((availableLocale) => (
          <DropdownMenuItem
            key={availableLocale}
            onClick={() => handleLanguageChange(availableLocale)}
            className={availableLocale === locale ? 'bg-accent' : ''}
          >
            {languageNames[availableLocale as keyof typeof languageNames] || availableLocale}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
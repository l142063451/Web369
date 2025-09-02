import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server'
import { PWARegister } from '@/components/pwa/PWARegister'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'

type Props = {
  children: React.ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'app' })
  
  return {
    title: `${t('title')} - Smart Village PWA`,
    description: t('description'),
    manifest: '/manifest.webmanifest',
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16A34A',
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: Props) {
  // Validate that the incoming `locale` is supported
  if (!locales.includes(locale as any)) {
    notFound()
  }

  // Enable static rendering
  unstable_setRequestLocale(locale)

  // Provide all messages to the client side
  const messages = await getMessages({ locale })

  return (
    <html lang={locale} className="font-sans">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#16A34A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ummid Se Hari" />
        {/* PWA iOS icons */}
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.svg" />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PWARegister />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
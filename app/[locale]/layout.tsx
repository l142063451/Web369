import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, unstable_setRequestLocale } from 'next-intl/server'
import { PWARegister } from '@/components/pwa/PWARegister'
import { FocusProvider, SkipLink } from '@/components/accessibility/FocusManagement'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'
import { analytics } from '@/lib/analytics'
import { seoService } from '@/lib/seo'

type Props = {
  children: React.ReactNode
  params: { locale: string }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'app' })
  
  // Generate comprehensive SEO metadata
  const metadata = seoService.generateMetadata({
    title: t('title'),
    description: t('description'),
    locale,
    type: 'website',
  })
  
  return {
    ...metadata,
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

  // Generate JSON-LD structured data
  const organizationJsonLd = seoService.generateOrganizationJsonLd()
  const websiteJsonLd = seoService.generateWebsiteJsonLd()
  const jsonLdScript = seoService.renderJsonLdScript([organizationJsonLd, websiteJsonLd])

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
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript }}
        />
        
        {/* Analytics Script */}
        {analytics.getClientScript() && (
          <script
            dangerouslySetInnerHTML={{ __html: analytics.getClientScript() }}
          />
        )}
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FocusProvider>
            {/* Skip to main content link */}
            <SkipLink href="#main-content">
              Skip to main content
            </SkipLink>
            
            <PWARegister />
            {children}
          </FocusProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
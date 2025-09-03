/**
 * Public Open Data Page
 * PR15 - Analytics, SEO & Open Data
 * 
 * Public access to village data for transparency and accountability
 */

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'
import { seoService } from '@/lib/seo'
import { PublicDataCatalog } from '@/components/open-data/PublicDataCatalog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Download, Users, Shield } from 'lucide-react'

type Props = {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'openData' })
  
  return seoService.generateMetadata({
    title: t('title'),
    description: t('description'),
    canonical: '/open-data',
    locale,
  })
}

export default async function OpenDataPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'openData' })
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="text-center">
              <Database className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">{t('features.comprehensive.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                {t('features.comprehensive.description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Download className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">{t('features.accessible.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                {t('features.accessible.description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Users className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">{t('features.transparent.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                {t('features.transparent.description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 mx-auto text-primary" />
              <CardTitle className="text-lg">{t('features.secure.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                {t('features.secure.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Catalog */}
        <Suspense fallback={<CatalogSkeleton />}>
          <PublicDataCatalog />
        </Suspense>

        {/* Usage Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('usage.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{t('usage.license.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('usage.license.description')}
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">{t('usage.formats.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('usage.formats.description')}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">{t('usage.updates.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('usage.updates.description')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CatalogSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="space-y-2">
                  <div className="h-5 w-64 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
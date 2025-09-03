/**
 * SEO Service - JSON-LD and Meta Tag Management
 * PR15 - Analytics, SEO & Open Data
 * 
 * Provides comprehensive SEO support with structured data,
 * meta tags, canonicals, and breadcrumb management
 */

import type { Metadata } from 'next'

export interface JsonLdData {
  '@context': string
  '@type': string
  [key: string]: any
}

export interface BreadcrumbItem {
  name: string
  item: string
  position: number
}

export interface SEOConfig {
  siteName: string
  siteUrl: string
  defaultTitle: string
  defaultDescription: string
  defaultImage: string
  twitterHandle?: string
  locale: string
}

class SEOService {
  private config: SEOConfig

  constructor() {
    this.config = {
      siteName: 'Ummid Se Hari',
      siteUrl: process.env.NEXTAUTH_URL || 'https://ummid-se-hari.com',
      defaultTitle: 'Ummid Se Hari - Smart, Green & Transparent Village',
      defaultDescription: 'Smart village PWA for Damday-Chuanala, promoting green initiatives, transparent governance, and community participation.',
      defaultImage: '/images/og-default.jpg',
      twitterHandle: '@UmmidSeHari',
      locale: 'en_US',
    }
  }

  /**
   * Generate comprehensive metadata for pages
   */
  generateMetadata({
    title,
    description,
    image,
    canonical,
    type = 'website',
    locale = 'en',
    publishedTime,
    modifiedTime,
    tags,
    noIndex = false,
  }: {
    title?: string
    description?: string
    image?: string
    canonical?: string
    type?: 'website' | 'article' | 'profile'
    locale?: string
    publishedTime?: string
    modifiedTime?: string
    tags?: string[]
    noIndex?: boolean
  } = {}): Metadata {
    const fullTitle = title ? `${title} | ${this.config.siteName}` : this.config.defaultTitle
    const fullDescription = description || this.config.defaultDescription
    const fullImage = image ? `${this.config.siteUrl}${image}` : `${this.config.siteUrl}${this.config.defaultImage}`
    const fullCanonical = canonical ? `${this.config.siteUrl}${canonical}` : undefined

    return {
      title: fullTitle,
      description: fullDescription,
      ...(fullCanonical && { alternates: { canonical: fullCanonical } }),
      ...(noIndex && { robots: { index: false, follow: false } }),
      openGraph: {
        type,
        siteName: this.config.siteName,
        title: fullTitle,
        description: fullDescription,
        images: [
          {
            url: fullImage,
            width: 1200,
            height: 630,
            alt: fullTitle,
          },
        ],
        locale: locale === 'en' ? 'en_US' : 'hi_IN',
        ...(publishedTime && { publishedTime }),
        ...(modifiedTime && { modifiedTime }),
        ...(tags && { tags }),
      },
      twitter: {
        card: 'summary_large_image',
        site: this.config.twitterHandle,
        creator: this.config.twitterHandle,
        title: fullTitle,
        description: fullDescription,
        images: [fullImage],
      },
    }
  }

  /**
   * Generate Organization JSON-LD
   */
  generateOrganizationJsonLd(): JsonLdData {
    return {
      '@context': 'https://schema.org',
      '@type': 'GovernmentOrganization',
      name: 'Damday-Chuanala Gram Panchayat',
      alternateName: 'Ummid Se Hari',
      description: 'Smart village initiative promoting sustainable development and transparent governance',
      url: this.config.siteUrl,
      logo: `${this.config.siteUrl}/images/logo.png`,
      image: `${this.config.siteUrl}/images/village-hero.jpg`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Gangolihat',
        addressRegion: 'Pithoragarh',
        addressCountry: 'IN',
        postalCode: '262524',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-XXXXXXXXXX',
        contactType: 'customer service',
        availableLanguage: ['English', 'Hindi'],
      },
      sameAs: [
        'https://www.facebook.com/ummidsehari',
        'https://www.twitter.com/ummidsehari',
        'https://www.instagram.com/ummidsehari',
      ],
      founder: {
        '@type': 'Person',
        name: 'Village Community',
      },
      areaServed: {
        '@type': 'Place',
        name: 'Damday-Chuanala',
        addressRegion: 'Uttarakhand',
        addressCountry: 'IN',
      },
    }
  }

  /**
   * Generate Government Service JSON-LD
   */
  generateGovernmentServiceJsonLd(service: {
    name: string
    description: string
    serviceType: string
    provider: string
    url: string
    eligibilityRequirement?: string
  }): JsonLdData {
    return {
      '@context': 'https://schema.org',
      '@type': 'GovernmentService',
      name: service.name,
      description: service.description,
      serviceType: service.serviceType,
      provider: {
        '@type': 'GovernmentOrganization',
        name: service.provider,
        url: this.config.siteUrl,
      },
      areaServed: {
        '@type': 'Place',
        name: 'Damday-Chuanala',
      },
      url: `${this.config.siteUrl}${service.url}`,
      ...(service.eligibilityRequirement && {
        eligibilityRequirement: service.eligibilityRequirement,
      }),
    }
  }

  /**
   * Generate Event JSON-LD
   */
  generateEventJsonLd(event: {
    name: string
    description: string
    startDate: string
    endDate?: string
    location: string
    organizer: string
    url: string
    image?: string
  }): JsonLdData {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      ...(event.endDate && { endDate: event.endDate }),
      location: {
        '@type': 'Place',
        name: event.location,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Gangolihat',
          addressRegion: 'Pithoragarh',
          addressCountry: 'IN',
        },
      },
      organizer: {
        '@type': 'Organization',
        name: event.organizer,
        url: this.config.siteUrl,
      },
      url: `${this.config.siteUrl}${event.url}`,
      ...(event.image && {
        image: `${this.config.siteUrl}${event.image}`,
      }),
    }
  }

  /**
   * Generate News Article JSON-LD
   */
  generateNewsArticleJsonLd(article: {
    headline: string
    description: string
    datePublished: string
    dateModified?: string
    author: string
    image?: string
    url: string
  }): JsonLdData {
    return {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.headline,
      description: article.description,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      author: {
        '@type': 'Person',
        name: article.author,
      },
      publisher: {
        '@type': 'Organization',
        name: this.config.siteName,
        logo: {
          '@type': 'ImageObject',
          url: `${this.config.siteUrl}/images/logo.png`,
        },
      },
      ...(article.image && {
        image: {
          '@type': 'ImageObject',
          url: `${this.config.siteUrl}${article.image}`,
          width: 1200,
          height: 630,
        },
      }),
      url: `${this.config.siteUrl}${article.url}`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${this.config.siteUrl}${article.url}`,
      },
    }
  }

  /**
   * Generate Place JSON-LD
   */
  generatePlaceJsonLd(place: {
    name: string
    description: string
    latitude: number
    longitude: number
    address?: string
    image?: string
    url: string
  }): JsonLdData {
    return {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: place.name,
      description: place.description,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: place.latitude,
        longitude: place.longitude,
      },
      ...(place.address && {
        address: {
          '@type': 'PostalAddress',
          streetAddress: place.address,
          addressLocality: 'Gangolihat',
          addressRegion: 'Pithoragarh',
          addressCountry: 'IN',
        },
      }),
      ...(place.image && {
        image: `${this.config.siteUrl}${place.image}`,
      }),
      url: `${this.config.siteUrl}${place.url}`,
    }
  }

  /**
   * Generate BreadcrumbList JSON-LD
   */
  generateBreadcrumbJsonLd(breadcrumbs: BreadcrumbItem[]): JsonLdData {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item) => ({
        '@type': 'ListItem',
        position: item.position,
        name: item.name,
        item: `${this.config.siteUrl}${item.item}`,
      })),
    }
  }

  /**
   * Generate Website JSON-LD
   */
  generateWebsiteJsonLd(): JsonLdData {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.config.siteName,
      alternateName: 'Smart Village PWA',
      description: this.config.defaultDescription,
      url: this.config.siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.config.siteUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Damday-Chuanala Gram Panchayat',
        logo: {
          '@type': 'ImageObject',
          url: `${this.config.siteUrl}/images/logo.png`,
        },
      },
      inLanguage: ['en-US', 'hi-IN'],
    }
  }

  /**
   * Render JSON-LD script tag
   */
  renderJsonLdScript(data: JsonLdData | JsonLdData[]): string {
    const jsonData = Array.isArray(data) ? data : [data]
    return JSON.stringify(jsonData, null, 0)
  }

  /**
   * Generate sitemap entry
   */
  generateSitemapEntry({
    url,
    changefreq = 'weekly',
    priority = 0.8,
    lastmod,
  }: {
    url: string
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority?: number
    lastmod?: Date
  }) {
    return {
      loc: `${this.config.siteUrl}${url}`,
      changefreq,
      priority,
      lastmod: lastmod ? lastmod.toISOString() : new Date().toISOString(),
    }
  }
}

export const seoService = new SEOService()
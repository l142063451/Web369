/**
 * News Article Detail Page - /news/[slug]
 * Individual news article page with SEO and sharing
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { NewsService } from '@/lib/news-events'
import { ShareButtons } from '../_components/ShareButtons'

interface NewsArticlePageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: NewsArticlePageProps): Promise<Metadata> {
  const article = await NewsService.getBySlug(params.slug)
  
  if (!article || article.status !== 'PUBLISHED') {
    return {
      title: 'Article Not Found | Ummid Se Hari'
    }
  }

  const seoTitle = (article.seo as any)?.title || article.title
  const seoDescription = (article.seo as any)?.description || article.excerpt
  const ogImage = (article.seo as any)?.ogImage || article.featuredImage

  return {
    title: `${seoTitle} | Ummid Se Hari`,
    description: seoDescription,
    keywords: (article.seo as any)?.keywords?.join(', '),
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      authors: ['Ummid Se Hari'],
      tags: article.tags,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: ogImage ? [ogImage] : undefined,
    }
  }
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const article = await NewsService.getBySlug(params.slug)

  if (!article || article.status !== 'PUBLISHED') {
    notFound()
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span>/</span>
          <Link href="/news" className="hover:text-green-600">News</Link>
          <span>/</span>
          <span className="text-gray-900">{article.title}</span>
        </nav>

        <article className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/news?tag=${encodeURIComponent(tag)}`}
                    className="inline-block px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-6 mb-8">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <time dateTime={article.publishedAt?.toISOString()}>
                    {article.publishedAt && formatDate(article.publishedAt)}
                  </time>
                </div>
              </div>

              <ShareButtons 
                title={article.title} 
                url={`/news/${article.slug}`}
              />
            </div>
          </header>

          {/* Featured Image */}
          {article.featuredImage && (
            <div className="mb-8">
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <Image
                  src={article.featuredImage}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-links:text-green-600 prose-links:no-underline hover:prose-links:underline"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          {/* Footer */}
          <footer className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Share this article:</span>
                <ShareButtons 
                  title={article.title} 
                  url={`/news/${article.slug}`}
                  compact
                />
              </div>
              
              <Link
                href="/news"
                className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to News
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}
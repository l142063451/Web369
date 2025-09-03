/**
 * NewsCard Component
 * Displays a news article card with image, title, excerpt, and metadata
 */

import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { type News } from '@/lib/news-events'

interface NewsCardProps {
  article: News
}

export function NewsCard({ article }: NewsCardProps) {
  const t = useTranslations('news')
  const tCommon = useTranslations('common')
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  const getExcerpt = (content: string, maxLength = 150) => {
    // Strip HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, '')
    if (plainText.length <= maxLength) return plainText
    return plainText.substring(0, maxLength) + '...'
  }

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Featured Image */}
      {article.featuredImage && (
        <Link href={`/news/${article.slug}`}>
          <div className="aspect-video relative overflow-hidden">
            <Image
              src={article.featuredImage}
              alt={article.title}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </Link>
      )}

      <div className="p-6">
        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {article.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/news?tag=${encodeURIComponent(tag)}`}
                className="inline-block px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
              >
                {tag}
              </Link>
            ))}
            {article.tags.length > 3 && (
              <span className="inline-block px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                +{article.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
          <Link 
            href={`/news/${article.slug}`}
            className="hover:text-green-700 transition-colors"
          >
            {article.title}
          </Link>
        </h2>

        {/* Excerpt */}
        <p className="text-gray-600 mb-4 line-clamp-3">
          {article.excerpt || getExcerpt(article.content)}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <time dateTime={article.publishedAt?.toISOString()}>
              {article.publishedAt ? formatDate(article.publishedAt) : 'Draft'}
            </time>
          </div>
          
          <Link
            href={`/news/${article.slug}`}
            className="text-green-600 hover:text-green-800 font-medium flex items-center space-x-1 transition-colors"
          >
            <span>{t('read_more')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  )
}
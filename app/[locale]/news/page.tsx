/**
 * News Listing Page - /news
 * Public page for browsing published news articles
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { NewsService } from '@/lib/news-events'
import { NewsCard } from './_components/NewsCard'
import { NewsPagination } from './_components/NewsPagination'
import { NewsSearch } from './_components/NewsSearch'
import { Loading } from '@/components/ui/loading'

export const metadata: Metadata = {
  title: 'News & Updates | Ummid Se Hari',
  description: 'Stay updated with the latest news and announcements from our village',
  openGraph: {
    title: 'News & Updates | Ummid Se Hari',
    description: 'Stay updated with the latest news and announcements from our village',
    type: 'website',
  },
}

interface NewsPageProps {
  searchParams: {
    page?: string
    search?: string
    tag?: string
  }
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const page = parseInt(searchParams.page || '1')
  const search = searchParams.search
  const tag = searchParams.tag

  const { news, pagination } = await NewsService.getPublished(page, 12)
  const tags = await NewsService.getTags()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            News & Updates
          </h1>
          <p className="text-lg text-gray-600">
            Stay updated with the latest happenings in our village
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <Suspense fallback={<div className="h-12 bg-gray-200 animate-pulse rounded-lg" />}>
            <NewsSearch tags={tags} currentTag={tag} currentSearch={search} />
          </Suspense>
        </div>

        {/* News Grid */}
        <Suspense fallback={<Loading />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {news.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          {news.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto max-w-md">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3v9m4-9v9m-4-9h4m-4 0h-4" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No news articles found</h3>
                <p className="mt-2 text-gray-500">
                  {search || tag 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Check back later for updates and announcements.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <NewsPagination pagination={pagination} />
          )}
        </Suspense>
      </div>
    </div>
  )
}
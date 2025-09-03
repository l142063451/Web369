/**
 * Notices Listing Page - /notices  
 * Public page for browsing notices with PDF.js viewer support
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { NoticesService } from '@/lib/news-events'
import { NoticeCard } from './_components/NoticeCard'
import { NoticesPagination } from './_components/NoticesPagination'
import { NoticesFilter } from './_components/NoticesFilter'
import { Loading } from '@/components/ui/loading'

export const metadata: Metadata = {
  title: 'Notices & Announcements | Ummid Se Hari',
  description: 'Official notices, tenders, public orders, and announcements',
  openGraph: {
    title: 'Notices & Announcements | Ummid Se Hari',
    description: 'Official notices, tenders, public orders, and announcements',
    type: 'website',
  },
}

interface NoticesPageProps {
  searchParams: {
    page?: string
    category?: string
    active?: string
    search?: string
  }
}

export default async function NoticesPage({ searchParams }: NoticesPageProps) {
  const page = parseInt(searchParams.page || '1')
  const category = searchParams.category
  const isActive = searchParams.active === 'true' ? true : searchParams.active === 'false' ? false : undefined
  const search = searchParams.search

  const { notices, pagination } = await NoticesService.list({
    category,
    isActive,
    search,
    page,
    limit: 12
  })

  const categories = await NoticesService.getCategoriesWithCounts()
  const stats = await NoticesService.getStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Notices & Announcements
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Official notices, tenders, orders, and public announcements
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active Notices</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Notices</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.withDeadlines}</div>
              <div className="text-sm text-gray-600">With Deadlines</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <div className="text-sm text-gray-600">Expired</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <Suspense fallback={<div className="h-12 bg-gray-200 animate-pulse rounded-lg" />}>
            <NoticesFilter
              currentCategory={category}
              currentActive={isActive}
              currentSearch={search}
              categories={categories}
            />
          </Suspense>
        </div>

        {/* Notices Grid */}
        <Suspense fallback={<Loading />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {notices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>

          {notices.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto max-w-md">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No notices found</h3>
                <p className="mt-2 text-gray-500">
                  {search || category || isActive !== undefined
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Check back later for new notices and announcements.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <NoticesPagination pagination={pagination} />
          )}
        </Suspense>
      </div>
    </div>
  )
}
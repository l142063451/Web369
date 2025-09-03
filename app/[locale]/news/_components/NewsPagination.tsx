/**
 * NewsPagination Component
 * Handles pagination for news listing
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface NewsPaginationProps {
  pagination: PaginationData
}

export function NewsPagination({ pagination }: NewsPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { page, totalPages } = pagination

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `?${params.toString()}`
  }

  const goToPage = (pageNumber: number) => {
    router.push(createPageURL(pageNumber))
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center space-x-2">
      {/* Previous Button */}
      <Button
        variant="outline"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        className="px-3 py-2"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {/* First page */}
        {page > 3 && (
          <>
            <Button
              variant={1 === page ? "default" : "ghost"}
              onClick={() => goToPage(1)}
              className="px-3 py-2"
            >
              1
            </Button>
            {page > 4 && <span className="px-2 text-gray-500">...</span>}
          </>
        )}

        {/* Pages around current */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNumber
          if (totalPages <= 5) {
            pageNumber = i + 1
          } else if (page <= 3) {
            pageNumber = i + 1
          } else if (page >= totalPages - 2) {
            pageNumber = totalPages - 4 + i
          } else {
            pageNumber = page - 2 + i
          }

          if (pageNumber < 1 || pageNumber > totalPages) return null

          return (
            <Button
              key={pageNumber}
              variant={pageNumber === page ? "default" : "ghost"}
              onClick={() => goToPage(pageNumber)}
              className="px-3 py-2 min-w-[40px]"
            >
              {pageNumber}
            </Button>
          )
        }).filter(Boolean)}

        {/* Last page */}
        {page < totalPages - 2 && (
          <>
            {page < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
            <Button
              variant={totalPages === page ? "default" : "ghost"}
              onClick={() => goToPage(totalPages)}
              className="px-3 py-2"
            >
              {totalPages}
            </Button>
          </>
        )}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-2"
      >
        Next
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </div>
  )
}
/**
 * EventsPagination Component
 * Handles pagination for events listing
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

interface EventsPaginationProps {
  pagination: PaginationData
}

export function EventsPagination({ pagination }: EventsPaginationProps) {
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
      <Button
        variant="outline"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        className="px-3 py-2"
      >
        Previous
      </Button>

      <div className="flex items-center space-x-1">
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
      </div>

      <Button
        variant="outline"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-2"
      >
        Next
      </Button>
    </div>
  )
}
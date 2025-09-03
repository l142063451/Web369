/**
 * NoticesPagination Component (Stub)
 */

'use client'

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface NoticesPaginationProps {
  pagination: PaginationData
}

export function NoticesPagination({ pagination }: NoticesPaginationProps) {
  // Same as NewsPagination - implementation placeholder
  return <div>Pagination for {pagination.total} notices</div>
}
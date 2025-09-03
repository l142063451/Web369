/**
 * NewsSearch Component
 * Search and filter functionality for news
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface NewsSearchProps {
  tags: string[]
  currentTag?: string
  currentSearch?: string
}

export function NewsSearch({ tags, currentTag, currentSearch }: NewsSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateURL({ search: search.trim() || undefined })
  }

  const handleTagFilter = (tag: string) => {
    updateURL({ tag: tag === currentTag ? undefined : tag })
  }

  const clearFilters = () => {
    setSearch('')
    updateURL({})
  }

  const updateURL = (params: { search?: string; tag?: string }) => {
    const newParams = new URLSearchParams()
    
    // Preserve existing params
    searchParams.forEach((value, key) => {
      if (key !== 'search' && key !== 'tag' && key !== 'page') {
        newParams.set(key, value)
      }
    })

    // Add new params
    if (params.search) {
      newParams.set('search', params.search)
    }
    if (params.tag) {
      newParams.set('tag', params.tag)
    }

    // Reset to first page when filtering
    newParams.delete('page')

    router.push(`?${newParams.toString()}`)
  }

  const hasActiveFilters = currentSearch || currentTag

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search news articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <Button type="submit" className="px-6">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </Button>
        </div>
      </form>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by topic:</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button
                key={tag}
                variant={tag === currentTag ? "default" : "outline"}
                size="sm"
                onClick={() => handleTagFilter(tag)}
                className="text-xs"
              >
                {tag}
                {tag === currentTag && (
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">Active filters:</span>
              {currentSearch && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{currentSearch}"
                </span>
              )}
              {currentTag && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Tag: {currentTag}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
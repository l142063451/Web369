/**
 * EventsFilter Component  
 * Filter and search functionality for events
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface EventsFilterProps {
  currentLocation?: string
  currentRsvp?: boolean
  currentSearch?: string
  currentStartDate?: Date
  currentEndDate?: Date
}

export function EventsFilter({ 
  currentLocation, 
  currentRsvp, 
  currentSearch, 
  currentStartDate, 
  currentEndDate 
}: EventsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch || '')
  const [location, setLocation] = useState(currentLocation || '')
  const [startDate, setStartDate] = useState(
    currentStartDate ? currentStartDate.toISOString().split('T')[0] : ''
  )
  const [endDate, setEndDate] = useState(
    currentEndDate ? currentEndDate.toISOString().split('T')[0] : ''
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateURL({ 
      search: search.trim() || undefined,
      location: location.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
  }

  const handleRsvpFilter = (rsvpRequired: boolean | undefined) => {
    updateURL({ rsvp: rsvpRequired })
  }

  const clearFilters = () => {
    setSearch('')
    setLocation('')
    setStartDate('')
    setEndDate('')
    updateURL({})
  }

  const updateURL = (params: { 
    search?: string
    location?: string
    rsvp?: boolean
    startDate?: string
    endDate?: string
  }) => {
    const newParams = new URLSearchParams()
    
    // Add new params
    if (params.search) {
      newParams.set('search', params.search)
    }
    if (params.location) {
      newParams.set('location', params.location)
    }
    if (params.rsvp !== undefined) {
      newParams.set('rsvp', params.rsvp.toString())
    }
    if (params.startDate) {
      newParams.set('startDate', params.startDate)
    }
    if (params.endDate) {
      newParams.set('endDate', params.endDate)
    }

    // Reset to first page when filtering
    newParams.delete('page')

    router.push(`?${newParams.toString()}`)
  }

  const hasActiveFilters = currentSearch || currentLocation || currentRsvp !== undefined || currentStartDate || currentEndDate

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              placeholder="Location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button type="submit" className="px-6">
            Apply Filters
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </form>

      {/* RSVP Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">RSVP Options:</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={currentRsvp === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => handleRsvpFilter(undefined)}
          >
            All Events
          </Button>
          <Button
            variant={currentRsvp === true ? "default" : "outline"}
            size="sm"
            onClick={() => handleRsvpFilter(true)}
          >
            RSVP Required
          </Button>
          <Button
            variant={currentRsvp === false ? "default" : "outline"}
            size="sm"
            onClick={() => handleRsvpFilter(false)}
          >
            No RSVP Needed
          </Button>
        </div>
      </div>
    </div>
  )
}
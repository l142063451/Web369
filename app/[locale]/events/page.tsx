/**
 * Events Listing Page - /events
 * Public page for browsing events with calendar view
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { EventsService } from '@/lib/news-events'
import { EventCard } from './_components/EventCard'
import { EventsPagination } from './_components/EventsPagination'
import { EventsFilter } from './_components/EventsFilter'
import { Loading } from '@/components/ui/loading'

export const metadata: Metadata = {
  title: 'Events & Calendar | Ummid Se Hari',
  description: 'Upcoming events, meetings, and community gatherings in our village',
  openGraph: {
    title: 'Events & Calendar | Ummid Se Hari',
    description: 'Upcoming events, meetings, and community gatherings in our village',
    type: 'website',
  },
}

interface EventsPageProps {
  searchParams: {
    page?: string
    startDate?: string
    endDate?: string
    location?: string
    rsvp?: string
    search?: string
  }
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const page = parseInt(searchParams.page || '1')
  const startDate = searchParams.startDate ? new Date(searchParams.startDate) : new Date()
  const endDate = searchParams.endDate ? new Date(searchParams.endDate) : undefined
  const location = searchParams.location
  const rsvpEnabled = searchParams.rsvp === 'true' ? true : searchParams.rsvp === 'false' ? false : undefined
  const search = searchParams.search

  const { events, pagination } = await EventsService.list({
    startDate,
    endDate,
    location,
    rsvpEnabled,
    search,
    page,
    limit: 12
  })

  const stats = await EventsService.getStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Events & Calendar
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Join our community events, meetings, and celebrations
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.upcomingEvents}</div>
              <div className="text-sm text-gray-600">Upcoming Events</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalEvents}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalRSVPs}</div>
              <div className="text-sm text-gray-600">Total RSVPs</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.confirmedRSVPs}</div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <Suspense fallback={<div className="h-12 bg-gray-200 animate-pulse rounded-lg" />}>
            <EventsFilter
              currentLocation={location}
              currentRsvp={rsvpEnabled}
              currentSearch={search}
              currentStartDate={startDate}
              currentEndDate={endDate}
            />
          </Suspense>
        </div>

        {/* Events Grid */}
        <Suspense fallback={<Loading />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto max-w-md">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No events found</h3>
                <p className="mt-2 text-gray-500">
                  {search || location || rsvpEnabled !== undefined
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Check back later for upcoming events and activities.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <EventsPagination pagination={pagination} />
          )}
        </Suspense>
      </div>
    </div>
  )
}
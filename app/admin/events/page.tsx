/**
 * Admin Events Management Page
 * PR12 - News/Notices/Events - Admin Interface for Events
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Calendar, Users, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { EventsService } from '@/lib/news-events'

export default async function AdminEventsPage() {
  // Get events and stats
  const { events, pagination } = await EventsService.list({
    page: 1,
    limit: 20
  })
  const stats = await EventsService.getStats()
  const upcomingEvents = await EventsService.getUpcoming(1, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
          <p className="mt-2 text-gray-600">
            Create and manage events with RSVP tracking and calendar integration
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold text-blue-600">{stats.upcomingEvents}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total RSVPs</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalRSVPs}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold text-gray-600">{stats.confirmedRSVPs}</p>
            </div>
            <Calendar className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Upcoming Events Alert */}
      {upcomingEvents.events.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Upcoming Events ({upcomingEvents.events.length})
              </h3>
              <div className="mt-2 space-y-1">
                {upcomingEvents.events.slice(0, 3).map((event: any) => (
                  <p key={event.id} className="text-sm text-blue-700">
                    <strong>{event.title}</strong> - {new Date(event.start).toLocaleDateString()} at {new Date(event.start).toLocaleTimeString()}
                  </p>
                ))}
                {upcomingEvents.events.length > 3 && (
                  <p className="text-sm text-blue-700">
                    and {upcomingEvents.events.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">All Events</h2>
        </div>
        
        <Suspense fallback={<Loading />}>
          <div className="divide-y">
            {events.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No events</h3>
                <p className="mt-2 text-gray-500">
                  Get started by creating your first event.
                </p>
                <Link href="/admin/events/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </Link>
              </div>
            ) : (
              events.map((event: any) => {
                const isUpcoming = new Date(event.start) > new Date()
                const isPast = new Date(event.end) < new Date()
                const isOngoing = new Date(event.start) <= new Date() && new Date(event.end) >= new Date()

                return (
                  <div key={event.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {event.title}
                          </h3>
                          <Badge 
                            variant={
                              isOngoing ? 'default' :
                              isUpcoming ? 'secondary' : 
                              'outline'
                            }
                          >
                            {isOngoing ? 'Live' : isUpcoming ? 'Upcoming' : 'Past'}
                          </Badge>
                          {event.rsvpEnabled && (
                            <Badge variant="outline" className="text-green-600">
                              RSVP Enabled
                            </Badge>
                          )}
                        </div>
                        
                        {event.description && (
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {event.description.length > 150 ? `${event.description.substring(0, 150)}...` : event.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.start).toLocaleDateString()} - {new Date(event.end).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(event.start).toLocaleTimeString()} - {new Date(event.end).toLocaleTimeString()}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                          {event.rsvpEnabled && event.rsvps && (
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {event.rsvps.length} RSVP{event.rsvps.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/events/${event.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                        {event.rsvpEnabled && (
                          <Link href={`/admin/events/${event.id}/rsvps`}>
                            <Button variant="ghost" size="sm">
                              RSVPs
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Suspense>
      </div>
    </div>
  )
}
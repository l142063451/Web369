/**
 * EventCard Component
 * Displays an event card with details and RSVP button
 */

import Link from 'next/link'
import { type Event } from '@/lib/news-events'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date))
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  const isUpcoming = new Date(event.start) > new Date()
  const isToday = new Date(event.start).toDateString() === new Date().toDateString()
  const isPast = new Date(event.end) < new Date()

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Status Badge */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isToday && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Today
              </span>
            )}
            {isUpcoming && !isToday && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Upcoming
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Past Event
              </span>
            )}
            {event.rsvpEnabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                RSVP Required
              </span>
            )}
          </div>
          
          {/* Calendar date icon */}
          <div className="flex-shrink-0 text-center bg-green-50 border border-green-200 rounded-lg p-2 w-14">
            <div className="text-xs font-medium text-green-600 uppercase">
              {formatDate(event.start).split(' ')[0]}
            </div>
            <div className="text-lg font-bold text-green-800">
              {formatDate(event.start).split(' ')[1]}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
          <Link 
            href={`/events/${event.id}`}
            className="hover:text-green-700 transition-colors"
          >
            {event.title}
          </Link>
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {event.description}
          </p>
        )}

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          {/* Date and Time */}
          <div className="flex items-start space-x-2 text-sm text-gray-600">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="font-medium">{formatDateTime(event.start)}</div>
              {event.start.getTime() !== event.end.getTime() && (
                <div className="text-xs">to {formatDateTime(event.end)}</div>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.location}</span>
            </div>
          )}

          {/* RSVP Count */}
          {event.rsvps && event.rsvps.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>
                {event.rsvps.filter(r => r.status === 'CONFIRMED').length} confirmed
                {event.rsvps.length > 0 && ` of ${event.rsvps.length} RSVPs`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Link
            href={`/events/${event.id}`}
            className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center space-x-1 transition-colors"
          >
            <span>View Details</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <div className="flex items-center space-x-2">
            {/* ICS Download */}
            <Link
              href={`/api/events/${event.id}/ics`}
              download
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Add to Calendar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </Link>

            {/* RSVP Status */}
            {event.rsvpEnabled && isUpcoming && (
              <Link
                href={`/events/${event.id}#rsvp`}
                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              >
                RSVP
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
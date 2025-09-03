/**
 * Event Detail Page - /events/[id]
 * Individual event page with RSVP functionality
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { EventsService, RSVPService } from '@/lib/news-events'
import { RSVPForm } from '../_components/RSVPForm'
import { ShareButtons } from '../../news/_components/ShareButtons'

interface EventDetailPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const event = await EventsService.getById(params.id)
  
  if (!event) {
    return {
      title: 'Event Not Found | Ummid Se Hari'
    }
  }

  return {
    title: `${event.title} | Ummid Se Hari`,
    description: event.description || `Event: ${event.title}`,
    openGraph: {
      title: event.title,
      description: event.description || `Event: ${event.title}`,
      type: 'article',
    }
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const event = await EventsService.getById(params.id)

  if (!event) {
    notFound()
  }

  const rsvpStats = event.rsvpEnabled ? await RSVPService.getEventRSVPStats(event.id) : null
  const isUpcoming = new Date(event.start) > new Date()
  const isPast = new Date(event.end) < new Date()

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span>/</span>
          <Link href="/events" className="hover:text-green-600">Events</Link>
          <span>/</span>
          <span className="text-gray-900">{event.title}</span>
        </nav>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              {isPast && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  Past Event
                </span>
              )}
              {isUpcoming && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Upcoming
                </span>
              )}
              {event.rsvpEnabled && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  RSVP Required
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {event.title}
            </h1>

            {/* Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                {/* Date and Time */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Date & Time</h3>
                    <p className="text-gray-600">{formatDateTime(event.start)}</p>
                    {event.start.getTime() !== event.end.getTime() && (
                      <p className="text-gray-500 text-sm">Ends: {formatDateTime(event.end)}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                {event.location && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Location</h3>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* RSVP Stats */}
              {rsvpStats && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">RSVP Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{rsvpStats.CONFIRMED}</div>
                      <div className="text-sm text-gray-600">Confirmed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{rsvpStats.total}</div>
                      <div className="text-sm text-gray-600">Total RSVPs</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-6">
              <div className="flex items-center space-x-4">
                <Link
                  href={`/api/events/${event.id}/ics`}
                  download
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Add to Calendar
                </Link>
              </div>

              <ShareButtons 
                title={event.title} 
                url={`/events/${event.id}`}
                compact
              />
            </div>
          </header>

          {/* Content */}
          {event.description && (
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Event Description</h2>
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}

          {/* Attachments */}
          {event.attachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Attachments</h2>
              <div className="space-y-2">
                {event.attachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Attachment {index + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* RSVP Form */}
          {event.rsvpEnabled && isUpcoming && (
            <div id="rsvp" className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">RSVP for this Event</h2>
              <RSVPForm eventId={event.id} />
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              href="/events"
              className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
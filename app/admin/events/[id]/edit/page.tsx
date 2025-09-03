/**
 * Edit Event Page
 * PR12 - News/Notices/Events - Admin Interface for Editing Events
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EventEditor } from '@/components/admin/events/EventEditor'
import { EventsService } from '@/lib/news-events'

interface EditEventPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: EditEventPageProps): Promise<Metadata> {
  const event = await EventsService.getById(params.id)
  
  return {
    title: `Edit ${event?.title || 'Event'} - Admin | Ummid Se Hari`,
    description: `Edit event: ${event?.title || 'Unknown event'}`,
  }
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const event = await EventsService.getById(params.id)

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/events">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <p className="mt-2 text-gray-600">
            Update &ldquo;{event.title}&rdquo;
          </p>
        </div>
      </div>

      {/* Editor */}
      <EventEditor mode="edit" event={event} />
    </div>
  )
}
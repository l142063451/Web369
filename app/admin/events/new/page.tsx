/**
 * Create Event Page
 * PR12 - News/Notices/Events - Admin Interface for Creating Events
 */

import { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EventEditor } from '@/components/admin/events/EventEditor'

export const metadata: Metadata = {
  title: 'Create Event - Admin | Ummid Se Hari',
  description: 'Create a new event with RSVP tracking and calendar integration',
}

export default function NewEventPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Create Event</h1>
          <p className="mt-2 text-gray-600">
            Create a new event with optional RSVP functionality and calendar integration
          </p>
        </div>
      </div>

      {/* Editor */}
      <EventEditor mode="create" />
    </div>
  )
}
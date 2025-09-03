/**
 * Admin Events API - Individual Event Operations
 * PUT /api/admin/events/[id] (Update), DELETE /api/admin/events/[id] (Delete)
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/auth/rbac'
import { EventsService, UpdateEventSchema } from '@/lib/news-events'

interface RouteParams {
  params: { id: string }
}

// PUT /api/admin/events/[id] - Update event
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update content
    const canUpdate = await checkPermission(session.user.id, 'CONTENT', 'WRITE')
    if (!canUpdate) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate the data
    const validatedData = UpdateEventSchema.parse({ ...body, id: params.id })

    // Update the event
    const event = await EventsService.update(validatedData, session.user.id)

    return Response.json({
      success: true,
      data: event
    })
  } catch (error: any) {
    console.error('Error updating event:', error)
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return Response.json(
      { success: false, error: error.message || 'Failed to update event' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/events/[id] - Delete event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to delete content
    const canDelete = await checkPermission(session.user.id, 'CONTENT', 'DELETE')
    if (!canDelete) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the event
    await EventsService.delete(params.id, session.user.id)

    return Response.json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting event:', error)
    return Response.json(
      { success: false, error: error.message || 'Failed to delete event' },
      { status: 500 }
    )
  }
}
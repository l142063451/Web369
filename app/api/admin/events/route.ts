/**
 * Admin Events API - POST /api/admin/events (Create), GET (List)
 * PR12 - Admin CRUD operations for events
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/auth/rbac'
import { EventsService, CreateEventSchema } from '@/lib/news-events'

// GET /api/admin/events - List all events (admin view)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage content
    const canManage = await checkPermission(session.user.id, 'CONTENT', 'WRITE')
    if (!canManage) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const rsvpEnabled = searchParams.get('rsvpEnabled') === 'true' ? true : undefined

    const result = await EventsService.list({
      page,
      limit,
      search,
      rsvpEnabled
    })

    return Response.json({
      success: true,
      data: result.events,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching admin events:', error)
    return Response.json(
      { success: false, error: error.message || 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

// POST /api/admin/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create content
    const canCreate = await checkPermission(session.user.id, 'CONTENT', 'WRITE')
    if (!canCreate) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate the data
    const validatedData = CreateEventSchema.parse(body)

    // Create the event
    const event = await EventsService.create(validatedData, session.user.id)

    return Response.json({
      success: true,
      data: event
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating event:', error)
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return Response.json(
      { success: false, error: error.message || 'Failed to create event' },
      { status: 500 }
    )
  }
}
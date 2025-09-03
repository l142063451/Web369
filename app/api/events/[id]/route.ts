/**
 * Events API Endpoints - GET /api/events/[id]
 * Public endpoint for fetching a single event by ID
 */

import { EventsService } from '@/lib/news-events'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return Response.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Get event by ID
    const event = await EventsService.getById(id)
    
    if (!event) {
      return Response.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }
    
    return Response.json({
      success: true,
      data: event
    })
  } catch (error: any) {
    console.error('Error fetching event:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch event' 
      },
      { status: 500 }
    )
  }
}
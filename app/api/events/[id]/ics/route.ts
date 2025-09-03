/**
 * Events ICS Export API - GET /api/events/[id]/ics
 * Public endpoint for downloading event as ICS calendar file
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

    // Generate ICS content
    const icsContent = EventsService.generateICS(event)
    
    // Return ICS file
    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error: any) {
    console.error('Error generating ICS:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate ICS file' 
      },
      { status: 500 }
    )
  }
}
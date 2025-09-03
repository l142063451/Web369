/**
 * Events API Endpoints - GET /api/events
 * Public endpoint for fetching events
 */

import { NextRequest } from 'next/server'
import { EventsService, EventFiltersSchema } from '@/lib/news-events'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const filters = {
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      location: searchParams.get('location') || undefined,
      rsvpEnabled: searchParams.get('rsvpEnabled') ? searchParams.get('rsvpEnabled') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    // Validate filters
    const validatedFilters = EventFiltersSchema.parse(filters)
    
    // Get events
    const result = await EventsService.list(validatedFilters)
    
    return Response.json({
      success: true,
      data: result.events,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching events:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch events' 
      },
      { status: 500 }
    )
  }
}
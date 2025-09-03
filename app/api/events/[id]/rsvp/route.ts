/**
 * Events RSVP API Endpoints - POST /api/events/[id]/rsvp
 * Public endpoint for RSVP to events
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/authOptions'
import { RSVPService, CreateRSVPSchema } from '@/lib/news-events'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params
    const body = await request.json()
    
    if (!eventId) {
      return Response.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Get user session if available
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // Create RSVP data
    const rsvpData = {
      eventId,
      ...body
    }

    // Validate RSVP data
    const validatedData = CreateRSVPSchema.parse(rsvpData)

    // Create RSVP
    const rsvp = await RSVPService.create(validatedData, userId)
    
    return Response.json({
      success: true,
      data: rsvp,
      message: 'RSVP submitted successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating RSVP:', error)
    
    if (error.message.includes('already exists')) {
      return Response.json(
        { success: false, error: 'You have already RSVPed for this event' },
        { status: 409 }
      )
    }
    
    if (error.message.includes('not enabled')) {
      return Response.json(
        { success: false, error: 'RSVP is not enabled for this event' },
        { status: 400 }
      )
    }
    
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to create RSVP' 
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: eventId } = params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!eventId) {
      return Response.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      )
    }

    if (!email) {
      return Response.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Get RSVP by event and email
    const rsvp = await RSVPService.getByEventAndEmail(eventId, email)
    
    return Response.json({
      success: true,
      data: rsvp
    })
  } catch (error: any) {
    console.error('Error fetching RSVP:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch RSVP' 
      },
      { status: 500 }
    )
  }
}
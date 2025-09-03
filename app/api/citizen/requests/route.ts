/**
 * Citizen Requests API - PR08
 * Handles fetching user's service requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/authOptions'
import { getUserSubmissions } from '@/lib/forms/service'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const status = url.searchParams.get('status')
    const serviceType = url.searchParams.get('serviceType')

    // Get user's submissions
    const requests = await getUserSubmissions(session.user.id, {
      page,
      limit,
      status,
      serviceType
    })

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total: requests.length // This would be the actual total from database
      }
    })

  } catch (error) {
    console.error('Citizen requests API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}
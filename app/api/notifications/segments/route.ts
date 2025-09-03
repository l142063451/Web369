/**
 * User Segments API
 * Get available user segments for audience targeting
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hasPermission } from '@/lib/rbac/permissions'
import { AudienceService } from '@/lib/notifications/audience'

// GET /api/notifications/segments - Get available user segments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !await hasPermission(session.user.id, 'notifications:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const segments = await AudienceService.getUserSegments()

    return NextResponse.json({
      success: true,
      segments
    })

  } catch (error) {
    console.error('Failed to get user segments:', error)
    return NextResponse.json({
      error: 'Failed to get user segments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
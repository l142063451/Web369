/**
 * Analytics API - Statistics and Metrics
 * GET /api/analytics/stats - Get analytics statistics for admin dashboard
 * 
 * Provides comprehensive analytics data with proper authorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/rbac/permissions'
import { analytics } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canViewAnalytics = await hasPermission(session.user.id, 'system:analytics')
    if (!canViewAnalytics) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const stats = await analytics.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )

    return NextResponse.json({
      success: true,
      data: stats,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('Error getting analytics stats:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics stats' },
      { status: 500 }
    )
  }
}
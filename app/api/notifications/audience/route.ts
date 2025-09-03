/**
 * Audience Management API
 * Preview and validate notification audiences
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hasPermission } from '@/lib/rbac/permissions'
import { AudienceService } from '@/lib/notifications/audience'
import { NotificationAudienceSchema } from '@/lib/notifications/types'

// POST /api/notifications/audience/preview - Get audience preview
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !await hasPermission(session.user.id, 'notifications:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate audience data
    const validationResult = NotificationAudienceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues
      }, { status: 400 })
    }

    const audience = validationResult.data

    // Validate audience criteria
    const audienceValidation = AudienceService.validateAudience(audience)
    if (!audienceValidation.valid) {
      return NextResponse.json({
        error: 'Invalid audience criteria',
        details: audienceValidation.errors
      }, { status: 400 })
    }

    // Get audience preview and size estimate
    const [preview, estimatedSize] = await Promise.all([
      AudienceService.getAudiencePreview(audience),
      AudienceService.estimateAudienceSize(audience)
    ])

    return NextResponse.json({
      success: true,
      estimatedSize,
      preview: preview.slice(0, 10), // Limit to 10 users for preview
      previewCount: preview.length,
      hasMore: estimatedSize > preview.length
    })

  } catch (error) {
    console.error('Failed to get audience preview:', error)
    return NextResponse.json({
      error: 'Failed to get audience preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
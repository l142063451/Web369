/**
 * Notification Management API
 * CRUD operations for notifications with RBAC protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/rbac/permissions'
import { notificationService } from '@/lib/notifications/service'
import { 
  NotificationRequestSchema, 
  NotificationAudienceSchema,
  NotificationChannelSchema
} from '@/lib/notifications/types'
import { createAuditLog } from '@/lib/audit/logger'
import { z } from 'zod'

// GET /api/notifications - List notifications with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !await hasPermission(session.user.id, 'notifications:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {}
    
    if (channel && ['EMAIL', 'SMS', 'WHATSAPP', 'WEB_PUSH'].includes(channel)) {
      where.channel = channel
    }

    if (status && ['PENDING', 'SENT', 'FAILED', 'CANCELLED', 'SCHEDULED'].includes(status)) {
      where.status = status
    }

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where })
    ])

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notifications - Create and send notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !await hasPermission(session.user.id, 'notifications:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = NotificationRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues
      }, { status: 400 })
    }

    const notificationRequest = validationResult.data

    // Send notification
    const result = await notificationService.sendNotification(notificationRequest)

    // Create audit log
    await createAuditLog({
      actorId: session.user.id,
      action: 'CREATE',
      resource: 'NOTIFICATION',
      resourceId: result.notificationId,
      metadata: {
        channel: notificationRequest.channel,
        templateId: notificationRequest.templateId,
        audience: notificationRequest.audience,
        recipientCount: result.results.length,
        successCount: result.stats.sent,
        failureCount: result.stats.failed
      }
    })

    return NextResponse.json({
      success: true,
      notificationId: result.notificationId,
      stats: result.stats,
      message: `Notification sent to ${result.results.length} recipients`
    })

  } catch (error) {
    console.error('Failed to send notification:', error)
    return NextResponse.json({
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
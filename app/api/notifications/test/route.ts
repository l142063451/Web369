/**
 * Test Notification API
 * Send test notifications to specific recipients
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hasPermission } from '@/lib/rbac/permissions'
import { notificationService } from '@/lib/notifications/service'
import { NotificationChannelSchema } from '@/lib/notifications/types'
import { z } from 'zod'

const TestNotificationSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  channel: NotificationChannelSchema,
  recipient: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    id: z.string().optional()
  }),
  variables: z.record(z.any()).default({})
}).refine(
  (data) => {
    // Validate recipient has appropriate contact method for channel
    switch (data.channel) {
      case 'EMAIL':
        return !!data.recipient.email
      case 'SMS':
      case 'WHATSAPP':
        return !!data.recipient.phone
      case 'WEB_PUSH':
        return !!data.recipient.id
      default:
        return false
    }
  },
  {
    message: "Recipient must have appropriate contact method for the selected channel"
  }
)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || !await hasPermission(session.user.id, 'notifications:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = TestNotificationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues
      }, { status: 400 })
    }

    const { templateId, channel, recipient, variables } = validationResult.data

    // Send test notification
    const result = await notificationService.sendTestNotification(
      templateId,
      channel,
      recipient,
      variables
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: `Test ${channel.toLowerCase()} notification sent successfully`,
        deliveredAt: result.deliveredAt
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: `Failed to send test ${channel.toLowerCase()} notification`
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Test notification failed:', error)
    return NextResponse.json({
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
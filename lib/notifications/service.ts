/**
 * Core Notification Service with advanced channel management
 * Implements template processing, audience targeting, and delivery tracking
 */

import { 
  NotificationChannel, 
  NotificationTemplate, 
  NotificationAudience, 
  NotificationRequest, 
  NotificationSendResult,
  NotificationError,
  TemplateError,
  AudienceError,
  NotificationStats
} from './types'
import { emailSender } from './channels/email'
import { smsSender } from './channels/sms'
import { whatsappSender } from './channels/whatsapp'
import { webpushSender } from './channels/webpush'
import { prisma } from '@/lib/db'
import { getUsersByAudience } from './audience'
import { processTemplate } from './template-engine'
import { logger } from '@/lib/utils'

export interface INotificationChannel {
  send(
    template: NotificationTemplate, 
    recipient: any, 
    variables: Record<string, any>
  ): Promise<NotificationSendResult>
  validateConfig(config: any): boolean
  getDeliveryStatus?(messageId: string): Promise<'delivered' | 'failed' | 'pending'>
}

export class NotificationService {
  private channels: Map<NotificationChannel, INotificationChannel> = new Map()

  constructor() {
    this.initializeChannels()
  }

  private initializeChannels() {
    this.channels.set('EMAIL', emailSender)
    this.channels.set('SMS', smsSender)
    this.channels.set('WHATSAPP', whatsappSender)
    this.channels.set('WEB_PUSH', webpushSender)
  }

  /**
   * Send notification to audience based on request
   */
  async sendNotification(request: NotificationRequest): Promise<{
    notificationId: string
    results: NotificationSendResult[]
    stats: NotificationStats
  }> {
    try {
      // Validate template exists
      const template = await this.getTemplate(request.templateId)
      if (!template) {
        throw new NotificationError(
          `Template not found: ${request.templateId}`,
          request.channel,
          'TEMPLATE_NOT_FOUND'
        )
      }

      // Validate template is active
      if (!template.active) {
        throw new NotificationError(
          `Template is inactive: ${request.templateId}`,
          request.channel,
          'TEMPLATE_INACTIVE'
        )
      }

      // Get channel implementation
      const channelSender = this.channels.get(request.channel)
      if (!channelSender) {
        throw new NotificationError(
          `Unsupported channel: ${request.channel}`,
          request.channel,
          'CHANNEL_NOT_SUPPORTED'
        )
      }

      // Get target audience
      const recipients = await getUsersByAudience(request.audience)
      if (recipients.length === 0) {
        throw new AudienceError(
          'No recipients found for the specified audience',
          request.audience
        )
      }

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          channel: request.channel,
          templateId: request.templateId,
          audience: request.audience as any,
          payload: {
            variables: request.variables || {},
            recipientCount: recipients.length,
            priority: request.priority,
          },
          status: request.scheduledAt ? 'SCHEDULED' : 'PENDING',
          scheduledAt: request.scheduledAt,
        }
      })

      // If scheduled for later, return early
      if (request.scheduledAt && request.scheduledAt > new Date()) {
        return {
          notificationId: notification.id,
          results: [],
          stats: { sent: 0, delivered: 0, failed: 0 }
        }
      }

      // Send notifications
      const results = await this.sendToRecipients(
        template,
        recipients,
        channelSender,
        request.variables || {},
        notification.id
      )

      // Calculate stats
      const stats = this.calculateStats(results)

      // Update notification with results
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: stats.failed === results.length ? 'FAILED' : 'SENT',
          stats: stats as any,
          sentAt: new Date(),
        }
      })

      logger.info(`Notification sent`, {
        notificationId: notification.id,
        channel: request.channel,
        recipientCount: recipients.length,
        successCount: stats.sent,
        failureCount: stats.failed
      })

      return {
        notificationId: notification.id,
        results,
        stats
      }

    } catch (error) {
      logger.error('Notification sending failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      })
      throw error
    }
  }

  /**
   * Send test notification to specific recipient
   */
  async sendTestNotification(
    templateId: string,
    channel: NotificationChannel,
    recipient: { email?: string; phone?: string; id?: string },
    variables: Record<string, any> = {}
  ): Promise<NotificationSendResult> {
    const template = await this.getTemplate(templateId)
    if (!template || template.channel !== channel) {
      throw new NotificationError(
        `Template not found or channel mismatch`,
        channel,
        'TEMPLATE_ERROR'
      )
    }

    const channelSender = this.channels.get(channel)
    if (!channelSender) {
      throw new NotificationError(
        `Channel not supported: ${channel}`,
        channel,
        'CHANNEL_NOT_SUPPORTED'
      )
    }

    // Create mock user object for test
    const testUser = {
      id: recipient.id || 'test-user',
      name: variables['user.name'] || 'Test User',
      email: recipient.email,
      phone: recipient.phone,
      locale: 'en'
    }

    return await channelSender.send(template, testUser, {
      ...variables,
      'user.name': testUser.name,
      'user.email': testUser.email,
      'user.phone': testUser.phone,
      'app.name': 'Ummid Se Hari',
      'app.url': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'date.now': new Date().toLocaleString('en-IN')
    })
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await prisma.notification.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lte: new Date()
          }
        },
        take: 50 // Process in batches
      })

      for (const notification of scheduledNotifications) {
        try {
          const request: NotificationRequest = {
            templateId: notification.templateId || '',
            channel: notification.channel as NotificationChannel,
            audience: notification.audience as NotificationAudience,
            variables: (notification.payload as any)?.variables || {},
            priority: (notification.payload as any)?.priority || 'NORMAL'
          }

          await this.sendNotification(request)
        } catch (error) {
          logger.error(`Failed to process scheduled notification ${notification.id}`, error)
          
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              stats: { error: error instanceof Error ? error.message : 'Unknown error' } as any
            }
          })
        }
      }
    } catch (error) {
      logger.error('Failed to process scheduled notifications', error)
    }
  }

  /**
   * Get notification delivery analytics
   */
  async getNotificationAnalytics(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      throw new Error('Notification not found')
    }

    // If channel supports delivery status tracking, fetch updated stats
    const channelSender = this.channels.get(notification.channel as NotificationChannel)
    if (channelSender?.getDeliveryStatus && notification.stats) {
      // This could be enhanced to track individual message delivery status
      // For now, return stored stats
    }

    return {
      notification,
      analytics: this.parseAnalytics(notification.stats as any)
    }
  }

  /**
   * Private helper methods
   */
  private async sendToRecipients(
    template: NotificationTemplate,
    recipients: any[],
    channelSender: INotificationChannel,
    variables: Record<string, any>,
    notificationId: string
  ): Promise<NotificationSendResult[]> {
    const results: NotificationSendResult[] = []
    
    // Send in batches to avoid overwhelming the system
    const batchSize = 10
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const recipientVariables = {
            ...variables,
            'user.name': recipient.name || '',
            'user.email': recipient.email || '',
            'user.phone': recipient.phone || '',
            'app.name': 'Ummid Se Hari',
            'app.url': process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'date.now': new Date().toLocaleString('en-IN')
          }

          return await channelSender.send(template, recipient, recipientVariables)
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            recipient: recipient.email || recipient.phone || recipient.id,
            channel: template.channel as NotificationChannel
          }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Batch processing failed',
            recipient: 'unknown',
            channel: template.channel as NotificationChannel
          })
        }
      })

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  private calculateStats(results: NotificationSendResult[]): NotificationStats {
    const sent = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const delivered = results.filter(r => r.success && r.deliveredAt).length

    return {
      sent,
      delivered,
      failed,
      // Additional stats can be populated by channel-specific implementations
    }
  }

  private parseAnalytics(stats: any) {
    if (!stats) return { deliveryRate: 0, openRate: 0, clickRate: 0 }

    const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0
    const openRate = stats.delivered > 0 ? ((stats.opened || 0) / stats.delivered) * 100 : 0
    const clickRate = stats.opened > 0 ? ((stats.clicked || 0) / stats.opened) * 100 : 0

    return {
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100
    }
  }

  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    // For now, use mock templates. In production, this would query a Template model
    const mockTemplates: NotificationTemplate[] = [
      {
        id: 'welcome-email',
        name: 'Welcome Email',
        channel: 'EMAIL',
        subject: 'Welcome to {{app.name}}!',
        content: 'Hello {{user.name}}, welcome to {{app.name}}. Your account has been created successfully.',
        variables: ['user.name', 'app.name'],
        metadata: {},
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'form-submitted-sms',
        name: 'Form Submitted SMS',
        channel: 'SMS',
        content: 'Your form has been submitted successfully. Reference ID: {{reference.id}}. Track status at {{app.url}}',
        variables: ['reference.id', 'app.url'],
        metadata: {},
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    return mockTemplates.find(t => t.id === templateId) || null
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
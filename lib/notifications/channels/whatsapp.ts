/**
 * WhatsApp Cloud API Channel Implementation
 * Production-grade WhatsApp Business messaging with templates and media support
 */

import { INotificationChannel } from '../service'
import { NotificationTemplate, NotificationSendResult, WhatsAppConfig, NotificationError } from '../types'
import { processTemplate } from '../template-engine'
import { logger } from '@/lib/utils'

interface WhatsAppMessage {
  messaging_product: 'whatsapp'
  to: string
  type: 'text' | 'template' | 'image' | 'document'
  text?: { body: string }
  template?: {
    name: string
    language: { code: string }
    components?: Array<{
      type: 'body' | 'header'
      parameters: Array<{ type: 'text', text: string }>
    }>
  }
  image?: { link: string; caption?: string }
  document?: { link: string; caption?: string; filename?: string }
}

interface WhatsAppResponse {
  messages?: Array<{ id: string }>
  error?: {
    message: string
    code: number
    error_subcode?: number
  }
}

export class WhatsAppSender implements INotificationChannel {
  private accessToken: string
  private phoneNumberId: string
  private businessId: string
  private baseUrl: string

  constructor() {
    this.accessToken = process.env.WA_ACCESS_TOKEN || ''
    this.phoneNumberId = process.env.WA_PHONE_ID || ''
    this.businessId = process.env.WA_BUSINESS_ID || ''
    this.baseUrl = 'https://graph.facebook.com/v18.0'

    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('WhatsApp configuration missing, WhatsApp notifications will be simulated')
    }
  }

  async send(
    template: NotificationTemplate,
    recipient: any,
    variables: Record<string, any>
  ): Promise<NotificationSendResult> {
    try {
      // Validate recipient has phone
      if (!recipient.phone) {
        throw new NotificationError(
          'Recipient phone number is required for WHATSAPP channel',
          'WHATSAPP',
          'NO_PHONE'
        )
      }

      // Clean and validate phone number for WhatsApp
      const cleanPhone = this.cleanPhoneNumber(recipient.phone)
      if (!this.isValidWhatsAppNumber(cleanPhone)) {
        throw new NotificationError(
          `Invalid WhatsApp phone number format: ${recipient.phone}`,
          'WHATSAPP',
          'INVALID_PHONE'
        )
      }

      // If no access token, simulate sending
      if (!this.accessToken || !this.phoneNumberId) {
        return await this.sendMockWhatsApp(cleanPhone, template, variables, recipient)
      }

      // Determine message type based on template metadata
      const messageType = template.metadata.messageType || 'text'
      let message: WhatsAppMessage

      switch (messageType) {
        case 'template':
          message = await this.createTemplateMessage(cleanPhone, template, variables, recipient)
          break
        case 'text':
        default:
          message = await this.createTextMessage(cleanPhone, template, variables, recipient)
          break
      }

      // Send message via WhatsApp Cloud API
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })

      const result: WhatsAppResponse = await response.json()

      if (response.ok && result.messages && result.messages.length > 0) {
        const messageId = result.messages[0].id

        logger.info('WhatsApp message sent successfully', {
          messageId,
          to: cleanPhone,
          type: messageType
        })

        return {
          success: true,
          messageId,
          recipient: cleanPhone,
          channel: 'WHATSAPP',
          deliveredAt: new Date()
        }
      } else {
        const error = result.error
        throw new Error(error ? `${error.message} (${error.code})` : 'WhatsApp API error')
      }

    } catch (error) {
      logger.error('Failed to send WhatsApp message', {
        recipient: recipient.phone,
        template: template.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
        recipient: recipient.phone || 'unknown',
        channel: 'WHATSAPP'
      }
    }
  }

  validateConfig(config: WhatsAppConfig): boolean {
    try {
      if (!config.businessId || !config.phoneNumberId) {
        return false
      }

      if (config.messageType && !['text', 'template', 'media'].includes(config.messageType)) {
        return false
      }

      if (config.messageType === 'template' && !config.templateName) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  async getDeliveryStatus(messageId: string): Promise<'delivered' | 'failed' | 'pending'> {
    try {
      if (!this.accessToken) {
        return 'delivered' // Mock always returns delivered
      }

      // WhatsApp delivery status is typically received via webhooks
      // This method would query the business phone number's message status
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/messages/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (response.ok) {
        const result = await response.json()
        const status = result.status?.toLowerCase()

        switch (status) {
          case 'delivered':
          case 'read':
            return 'delivered'
          case 'failed':
            return 'failed'
          default:
            return 'pending'
        }
      }

      return 'pending'
    } catch (error) {
      logger.error('Failed to get WhatsApp delivery status', { messageId, error })
      return 'pending'
    }
  }

  /**
   * Create different types of WhatsApp messages
   */
  private async createTextMessage(
    phone: string,
    template: NotificationTemplate,
    variables: Record<string, any>,
    recipient: any
  ): Promise<WhatsAppMessage> {
    const processedContent = processTemplate(
      template.content,
      { ...variables, user: recipient },
      template.id
    )

    // WhatsApp has a character limit of 4096 for text messages
    if (processedContent.length > 4096) {
      logger.warn('WhatsApp message exceeds character limit, truncating', {
        originalLength: processedContent.length,
        recipient: phone
      })
    }

    return {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: {
        body: processedContent.substring(0, 4096)
      }
    }
  }

  private async createTemplateMessage(
    phone: string,
    template: NotificationTemplate,
    variables: Record<string, any>,
    recipient: any
  ): Promise<WhatsAppMessage> {
    const templateName = template.metadata.templateName
    const language = recipient.locale === 'hi' ? 'hi' : 'en_US'

    if (!templateName) {
      throw new NotificationError(
        'Template name is required for WhatsApp template messages',
        'WHATSAPP',
        'NO_TEMPLATE_NAME'
      )
    }

    // Process template variables for WhatsApp template
    const templateParams = template.metadata.templateParams || []
    const processedParams = templateParams.map((param: string) => {
      const processedParam = processTemplate(
        param,
        { ...variables, user: recipient },
        template.id
      )
      return { type: 'text', text: processedParam }
    })

    return {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: processedParams.length > 0 ? [
          {
            type: 'body',
            parameters: processedParams
          }
        ] : undefined
      }
    }
  }

  /**
   * Mock WhatsApp sending for development
   */
  private async sendMockWhatsApp(
    phone: string,
    template: NotificationTemplate,
    variables: Record<string, any>,
    recipient: any
  ): Promise<NotificationSendResult> {
    const processedContent = processTemplate(
      template.content,
      { ...variables, user: recipient },
      template.id
    )

    logger.info('Mock WhatsApp message sent', {
      to: phone,
      content: processedContent.substring(0, 50) + (processedContent.length > 50 ? '...' : ''),
      messageType: template.metadata.messageType || 'text'
    })

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    return {
      success: true,
      messageId: `wa-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipient: phone,
      channel: 'WHATSAPP',
      deliveredAt: new Date()
    }
  }

  /**
   * Utility methods
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    
    // Add country code for Indian numbers if not present
    if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
      cleaned = '91' + cleaned
    }
    
    return cleaned
  }

  private isValidWhatsAppNumber(phone: string): boolean {
    // WhatsApp accepts international format numbers
    // For Indian numbers: 91XXXXXXXXXX (country code + 10 digit mobile)
    return /^91[6-9]\d{9}$/.test(phone) || /^\d{10,15}$/.test(phone)
  }

  /**
   * Get available WhatsApp templates for business account
   */
  async getAvailableTemplates(): Promise<Array<{
    name: string
    status: string
    language: string
    components: any[]
  }>> {
    try {
      if (!this.accessToken || !this.businessId) {
        return []
      }

      const response = await fetch(
        `${this.baseUrl}/${this.businessId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (response.ok) {
        const result = await response.json()
        return result.data || []
      }

      return []
    } catch (error) {
      logger.error('Failed to fetch WhatsApp templates', error)
      return []
    }
  }

  /**
   * Register webhook for delivery status updates
   */
  async registerWebhook(webhookUrl: string, verifyToken: string): Promise<boolean> {
    try {
      if (!this.accessToken || !this.businessId) {
        return false
      }

      const response = await fetch(
        `${this.baseUrl}/${this.businessId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscribed_fields: ['messages', 'message_deliveries', 'message_reads'],
            callback_url: webhookUrl,
            verify_token: verifyToken
          })
        }
      )

      return response.ok
    } catch (error) {
      logger.error('Failed to register WhatsApp webhook', error)
      return false
    }
  }
}

// Export singleton instance
export const whatsappSender = new WhatsAppSender()
/**
 * SMS Channel Implementation
 * Supports multiple providers: MSG91, Gupshup, Textlocal with DLT compliance
 */

import { INotificationChannel } from '../service'
import { NotificationTemplate, NotificationSendResult, SMSConfig, NotificationError } from '../types'
import { processTemplate } from '../template-engine'
import { logger } from '@/lib/utils'

type SMSProvider = 'msg91' | 'gupshup' | 'textlocal' | 'mock'

interface SMSProviderResponse {
  success: boolean
  messageId?: string
  error?: string
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'pending'
}

export class SMSSender implements INotificationChannel {
  private provider: SMSProvider
  private apiKey: string
  private senderId: string

  constructor() {
    this.provider = (process.env.SMS_PROVIDER as SMSProvider) || 'mock'
    this.apiKey = process.env.SMS_API_KEY || ''
    this.senderId = process.env.SMS_SENDER_ID || 'UMMID'

    if (this.provider !== 'mock' && !this.apiKey) {
      logger.warn('SMS API key not configured, SMS notifications will be simulated')
      this.provider = 'mock'
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
          'Recipient phone number is required for SMS channel',
          'SMS',
          'NO_PHONE'
        )
      }

      // Clean and validate phone number
      const cleanPhone = this.cleanPhoneNumber(recipient.phone)
      if (!this.isValidPhoneNumber(cleanPhone)) {
        throw new NotificationError(
          `Invalid phone number format: ${recipient.phone}`,
          'SMS',
          'INVALID_PHONE'
        )
      }

      // Process template content
      const processedContent = processTemplate(
        template.content,
        { ...variables, user: recipient },
        template.id
      )

      // Validate content length (SMS limit is typically 160-918 characters depending on encoding)
      const contentLength = this.calculateSMSLength(processedContent)
      if (contentLength.chars > 918) { // Max for long SMS
        logger.warn('SMS content exceeds recommended length', {
          length: contentLength.chars,
          segments: contentLength.segments,
          recipient: cleanPhone
        })
      }

      // Send SMS based on provider
      const result = await this.sendSMS(cleanPhone, processedContent, template.metadata)

      if (result.success) {
        logger.info('SMS sent successfully', {
          provider: this.provider,
          messageId: result.messageId,
          to: cleanPhone,
          segments: contentLength.segments
        })

        return {
          success: true,
          messageId: result.messageId,
          recipient: cleanPhone,
          channel: 'SMS',
          deliveredAt: new Date()
        }
      } else {
        throw new Error(result.error || 'SMS sending failed')
      }

    } catch (error) {
      logger.error('Failed to send SMS', {
        recipient: recipient.phone,
        template: template.id,
        provider: this.provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
        recipient: recipient.phone || 'unknown',
        channel: 'SMS'
      }
    }
  }

  validateConfig(config: SMSConfig): boolean {
    try {
      if (!config.senderId || config.senderId.length === 0) {
        return false
      }

      // Sender ID should be 6 characters for India DLT compliance
      if (config.senderId.length > 6) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  async getDeliveryStatus(messageId: string): Promise<'delivered' | 'failed' | 'pending'> {
    try {
      switch (this.provider) {
        case 'msg91':
          return await this.getMSG91DeliveryStatus(messageId)
        case 'gupshup':
          return await this.getGupshupDeliveryStatus(messageId)
        case 'textlocal':
          return await this.getTextlocalDeliveryStatus(messageId)
        default:
          return 'delivered' // Mock always returns delivered
      }
    } catch (error) {
      logger.error('Failed to get SMS delivery status', { messageId, error })
      return 'pending'
    }
  }

  /**
   * Provider-specific SMS sending implementations
   */
  private async sendSMS(
    phone: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<SMSProviderResponse> {
    switch (this.provider) {
      case 'msg91':
        return await this.sendMSG91SMS(phone, content, metadata)
      case 'gupshup':
        return await this.sendGupshupSMS(phone, content, metadata)
      case 'textlocal':
        return await this.sendTextlocalSMS(phone, content, metadata)
      default:
        return await this.sendMockSMS(phone, content)
    }
  }

  private async sendMSG91SMS(phone: string, content: string, metadata: Record<string, any>): Promise<SMSProviderResponse> {
    try {
      const templateId = metadata.templateId || process.env.SMS_DLT_TEMPLATE_ID_DEFAULT
      
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.apiKey
        },
        body: JSON.stringify({
          template_id: templateId,
          sender: this.senderId,
          short_url: '0',
          mobiles: phone,
          var1: content // For template variable substitution
        })
      })

      const result = await response.json()

      if (response.ok && result.type === 'success') {
        return {
          success: true,
          messageId: result.request_id,
          deliveryStatus: 'sent'
        }
      } else {
        return {
          success: false,
          error: result.message || 'MSG91 API error'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MSG91 request failed'
      }
    }
  }

  private async sendGupshupSMS(phone: string, content: string, metadata: Record<string, any>): Promise<SMSProviderResponse> {
    try {
      const params = new URLSearchParams({
        method: 'SendMessage',
        send_to: phone,
        msg: content,
        msg_type: 'TEXT',
        userid: process.env.GUPSHUP_USER_ID || '',
        auth_scheme: 'plain',
        password: this.apiKey,
        format: 'json',
        v: '1.1'
      })

      const response = await fetch('https://enterprise.smsgupshup.com/GatewayAPI/rest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      })

      const result = await response.text()
      const data = JSON.parse(result)

      if (data.response.status === 'success') {
        return {
          success: true,
          messageId: data.response.id,
          deliveryStatus: 'sent'
        }
      } else {
        return {
          success: false,
          error: data.response.details || 'Gupshup API error'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gupshup request failed'
      }
    }
  }

  private async sendTextlocalSMS(phone: string, content: string, metadata: Record<string, any>): Promise<SMSProviderResponse> {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        numbers: phone,
        message: content,
        sender: this.senderId,
        test: process.env.NODE_ENV !== 'production' ? '1' : '0'
      })

      const response = await fetch('https://api.textlocal.in/send/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      })

      const result = await response.json()

      if (result.status === 'success') {
        return {
          success: true,
          messageId: result.batch_id,
          deliveryStatus: 'sent'
        }
      } else {
        return {
          success: false,
          error: result.errors?.[0]?.message || 'Textlocal API error'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Textlocal request failed'
      }
    }
  }

  private async sendMockSMS(phone: string, content: string): Promise<SMSProviderResponse> {
    // Simulate SMS sending for development/testing
    logger.info('Mock SMS sent', {
      to: phone,
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      provider: 'mock'
    })

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deliveryStatus: 'sent'
    }
  }

  /**
   * Delivery status checking methods
   */
  private async getMSG91DeliveryStatus(messageId: string): Promise<'delivered' | 'failed' | 'pending'> {
    try {
      const response = await fetch(`https://control.msg91.com/api/v5/report/${messageId}`, {
        headers: { 'authkey': this.apiKey }
      })
      
      const result = await response.json()
      const status = result.data?.[0]?.status?.toLowerCase()

      switch (status) {
        case 'delivered':
        case 'delivrd':
          return 'delivered'
        case 'failed':
        case 'rejected':
        case 'undelivered':
          return 'failed'
        default:
          return 'pending'
      }
    } catch {
      return 'pending'
    }
  }

  private async getGupshupDeliveryStatus(messageId: string): Promise<'delivered' | 'failed' | 'pending'> {
    // Gupshup delivery reports are typically received via webhooks
    // This is a placeholder for webhook-based status updates
    return 'pending'
  }

  private async getTextlocalDeliveryStatus(messageId: string): Promise<'delivered' | 'failed' | 'pending'> {
    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        batch_id: messageId
      })

      const response = await fetch(`https://api.textlocal.in/get_delivery_receipt/?${params}`)
      const result = await response.json()

      if (result.status === 'success' && result.receipts?.length > 0) {
        const status = result.receipts[0].status?.toLowerCase()
        
        switch (status) {
          case 'delivered':
            return 'delivered'
          case 'undelivered':
          case 'failed':
            return 'failed'
          default:
            return 'pending'
        }
      }

      return 'pending'
    } catch {
      return 'pending'
    }
  }

  /**
   * Utility methods
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters and handle Indian numbers
    let cleaned = phone.replace(/\D/g, '')
    
    // Add country code for Indian numbers
    if (cleaned.length === 10 && cleaned.match(/^[6-9]/)) {
      cleaned = '91' + cleaned
    }
    
    return cleaned
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Indian mobile number validation
    return /^91[6-9]\d{9}$/.test(phone)
  }

  private calculateSMSLength(content: string): { chars: number; segments: number } {
    const chars = content.length
    
    // SMS segment calculation (160 chars for single, 153 for multi-part)
    let segments = 1
    if (chars > 160) {
      segments = Math.ceil(chars / 153)
    }
    
    return { chars, segments }
  }
}

// Export singleton instance
export const smsSender = new SMSSender()
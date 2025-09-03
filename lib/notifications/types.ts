/**
 * Comprehensive TypeScript types for Notifications Center
 * Supporting SMTP, SMS, WhatsApp, and Web Push channels
 */

import { z } from 'zod'

// ===== CORE NOTIFICATION TYPES =====

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEB_PUSH'
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'SCHEDULED'

export interface NotificationTemplate {
  id: string
  name: string
  channel: NotificationChannel
  subject?: string // For email
  content: string
  variables: string[]
  metadata: Record<string, any>
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationAudience {
  type: 'ALL' | 'ROLE' | 'CUSTOM'
  criteria: {
    roles?: string[]
    userIds?: string[]
    wards?: string[]
    interests?: string[]
    hasPhone?: boolean
    hasEmail?: boolean
    locale?: string[]
  }
}

export interface NotificationRequest {
  templateId: string
  channel: NotificationChannel
  audience: NotificationAudience
  variables?: Record<string, any>
  scheduledAt?: Date
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

export interface NotificationSendResult {
  success: boolean
  messageId?: string
  error?: string
  deliveredAt?: Date
  recipient: string
  channel: NotificationChannel
}

// ===== CHANNEL SPECIFIC TYPES =====

export interface EmailConfig {
  from: string
  replyTo?: string
  html?: boolean
  attachments?: Array<{
    filename: string
    content: string
    contentType: string
  }>
}

export interface SMSConfig {
  senderId: string
  templateId?: string // For DLT compliance
  unicode: boolean
}

export interface WhatsAppConfig {
  businessId: string
  phoneNumberId: string
  messageType: 'text' | 'template' | 'media'
  templateName?: string
  templateParams?: string[]
}

export interface WebPushConfig {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
  ttl: number
}

// ===== NOTIFICATION ANALYTICS =====

export interface NotificationStats {
  sent: number
  delivered: number
  failed: number
  opened?: number
  clicked?: number
  unsubscribed?: number
  bounced?: number
}

export interface NotificationAnalytics {
  id: string
  notificationId: string
  channel: NotificationChannel
  stats: NotificationStats
  deliveryRate: number
  openRate?: number
  clickRate?: number
  createdAt: Date
  updatedAt: Date
}

// ===== ZOD VALIDATION SCHEMAS =====

export const NotificationChannelSchema = z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'WEB_PUSH'])
export const NotificationStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED', 'SCHEDULED'])

export const NotificationAudienceSchema = z.object({
  type: z.enum(['ALL', 'ROLE', 'CUSTOM']),
  criteria: z.object({
    roles: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
    wards: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    hasPhone: z.boolean().optional(),
    hasEmail: z.boolean().optional(),
    locale: z.array(z.string()).optional(),
  }),
})

export const NotificationTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  channel: NotificationChannelSchema,
  subject: z.string().optional(),
  content: z.string().min(1, 'Template content is required'),
  variables: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  active: z.boolean().default(true),
})

export const NotificationRequestSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  channel: NotificationChannelSchema,
  audience: NotificationAudienceSchema,
  variables: z.record(z.any()).optional(),
  scheduledAt: z.date().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
})

export const EmailConfigSchema = z.object({
  from: z.string().email(),
  replyTo: z.string().email().optional(),
  html: z.boolean().default(true),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string(),
  })).optional(),
})

export const SMSConfigSchema = z.object({
  senderId: z.string().min(1),
  templateId: z.string().optional(),
  unicode: z.boolean().default(false),
})

export const WhatsAppConfigSchema = z.object({
  businessId: z.string().min(1),
  phoneNumberId: z.string().min(1),
  messageType: z.enum(['text', 'template', 'media']),
  templateName: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
})

export const WebPushConfigSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().url().optional(),
  badge: z.string().url().optional(),
  image: z.string().url().optional(),
  actions: z.array(z.object({
    action: z.string(),
    title: z.string(),
    icon: z.string().url().optional(),
  })).optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().default(false),
  ttl: z.number().default(86400), // 24 hours
})

// ===== TEMPLATE VARIABLE HELPERS =====

export interface TemplateVariable {
  key: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'url'
  required: boolean
  description: string
  example?: string
}

export const COMMON_TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: 'user.name',
    type: 'text',
    required: false,
    description: 'User full name',
    example: 'John Doe'
  },
  {
    key: 'user.email',
    type: 'text',
    required: false,
    description: 'User email address',
    example: 'john@example.com'
  },
  {
    key: 'user.phone',
    type: 'text',
    required: false,
    description: 'User phone number',
    example: '+91 9876543210'
  },
  {
    key: 'app.name',
    type: 'text',
    required: true,
    description: 'Application name',
    example: 'Ummid Se Hari'
  },
  {
    key: 'app.url',
    type: 'url',
    required: true,
    description: 'Application base URL',
    example: 'https://ummid-se-hari.com'
  },
  {
    key: 'date.now',
    type: 'date',
    required: true,
    description: 'Current date and time',
    example: '2024-01-15 10:30 AM'
  }
]

// ===== ERROR TYPES =====

export class NotificationError extends Error {
  constructor(
    message: string,
    public channel: NotificationChannel,
    public code: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'NotificationError'
  }
}

export class TemplateError extends Error {
  constructor(
    message: string,
    public templateId: string,
    public variables?: string[]
  ) {
    super(message)
    this.name = 'TemplateError'
  }
}

export class AudienceError extends Error {
  constructor(
    message: string,
    public audience: NotificationAudience
  ) {
    super(message)
    this.name = 'AudienceError'
  }
}
/**
 * Notices Service Layer for PR12 - News/Notices/Events
 * Implements notices with PDF.js viewer and deadline tracking
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/auth/audit-logger'
import DOMPurify from 'isomorphic-dompurify'

// Type definitions
export interface Notice {
  id: string
  title: string
  category: string
  deadline?: Date
  body: string
  attachments: string[]
  createdAt: Date
  updatedAt: Date
}

// Validation schemas
// Base schema without refinement
const CreateNoticeBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  deadline: z.date().optional(),
  body: z.string().min(1, 'Body is required'),
  attachments: z.array(z.string().url()).default([])
})

export const CreateNoticeSchema = CreateNoticeBaseSchema.refine(data => !data.deadline || data.deadline > new Date(), {
  message: 'Deadline must be in the future',
  path: ['deadline']
})

export const UpdateNoticeSchema = CreateNoticeBaseSchema.partial().extend({
  id: z.string().cuid()
}).refine((data) => !data.deadline || data.deadline > new Date(), {
  message: 'Deadline must be in the future',
  path: ['deadline']
})

export const NoticeFiltersSchema = z.object({
  category: z.string().optional(),
  hasDeadline: z.boolean().optional(),
  isActive: z.boolean().optional(), // deadline not passed
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
})

// Common notice categories
export const NOTICE_CATEGORIES = [
  'Tenders',
  'Public Orders',
  'Announcements',
  'Schemes',
  'Meetings',
  'Recruitment',
  'General'
] as const

export class NoticesService {
  /**
   * Create a new notice
   */
  static async create(data: z.infer<typeof CreateNoticeSchema>, userId: string): Promise<Notice> {
    const validated = CreateNoticeSchema.parse(data)

    // Sanitize HTML content
    const sanitizedData = {
      ...validated,
      body: DOMPurify.sanitize(validated.body, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'],
        ALLOWED_ATTR: []
      })
    }

    const notice = await prisma.notice.create({
      data: sanitizedData
    })

    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'Notice',
      resourceId: notice.id,
      actorId: userId,
      diff: { after: notice }
    })

    return notice as Notice
  }

  /**
   * Update an existing notice
   */
  static async update(data: z.infer<typeof UpdateNoticeSchema>, userId: string): Promise<Notice> {
    const validated = UpdateNoticeSchema.parse(data)
    const { id, ...updateData } = validated

    const existingNotice = await prisma.notice.findUnique({
      where: { id }
    })

    if (!existingNotice) {
      throw new Error('Notice not found')
    }

    const notice = await prisma.notice.update({
      where: { id },
      data: updateData
    })

    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'Notice',
      resourceId: notice.id,
      actorId: userId,
      diff: { before: existingNotice, after: notice }
    })

    return notice as Notice
  }

  /**
   * Delete a notice
   */
  static async delete(id: string, userId: string): Promise<void> {
    const existingNotice = await prisma.notice.findUnique({
      where: { id }
    })

    if (!existingNotice) {
      throw new Error('Notice not found')
    }

    await prisma.notice.delete({
      where: { id }
    })

    // Create audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'Notice',
      resourceId: id,
      actorId: userId,
      diff: { before: existingNotice }
    })
  }

  /**
   * Get notice by ID
   */
  static async getById(id: string): Promise<Notice | null> {
    const notice = await prisma.notice.findUnique({
      where: { id }
    })

    return notice as Notice | null
  }

  /**
   * List notices with filtering and pagination
   */
  static async list(filters: z.infer<typeof NoticeFiltersSchema>) {
    const validated = NoticeFiltersSchema.parse(filters)
    const { page, limit, category, hasDeadline, isActive, search } = validated

    const where: any = {}

    // Category filter
    if (category) {
      where.category = category
    }

    // Deadline filter
    if (hasDeadline !== undefined) {
      if (hasDeadline) {
        where.deadline = { not: null }
      } else {
        where.deadline = null
      }
    }

    // Active/expired filter based on deadline
    if (isActive !== undefined) {
      if (isActive) {
        where.OR = [
          { deadline: null },
          { deadline: { gte: new Date() } }
        ]
      } else {
        where.deadline = { lt: new Date() }
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        orderBy: [
          { deadline: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notice.count({ where })
    ])

    return {
      notices: notices as Notice[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get active notices (not expired)
   */
  static async getActive(page = 1, limit = 10) {
    return this.list({
      isActive: true,
      page,
      limit
    })
  }

  /**
   * Get notices by category
   */
  static async getByCategory(category: string, page = 1, limit = 10) {
    return this.list({
      category,
      page,
      limit
    })
  }

  /**
   * Get notices with upcoming deadlines
   */
  static async getUpcomingDeadlines(days = 7) {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + days)

    return this.list({
      hasDeadline: true,
      page: 1,
      limit: 100
    }).then(result => ({
      ...result,
      notices: result.notices.filter(notice => 
        notice.deadline && 
        notice.deadline >= now && 
        notice.deadline <= futureDate
      )
    }))
  }

  /**
   * Get expired notices
   */
  static async getExpired(page = 1, limit = 10) {
    return this.list({
      isActive: false,
      page,
      limit
    })
  }

  /**
   * Search notices
   */
  static async search(query: string, page = 1, limit = 10) {
    return this.list({
      search: query,
      page,
      limit
    })
  }

  /**
   * Get notice categories with counts
   */
  static async getCategoriesWithCounts() {
    const categories = await prisma.notice.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    })

    return categories.map((cat: any) => ({
      category: cat.category,
      count: cat._count.category
    }))
  }

  /**
   * Get notice statistics
   */
  static async getStats() {
    const now = new Date()
    
    const [total, active, withDeadlines, expired] = await Promise.all([
      prisma.notice.count(),
      prisma.notice.count({
        where: {
          OR: [
            { deadline: null },
            { deadline: { gte: now } }
          ]
        }
      }),
      prisma.notice.count({
        where: { deadline: { not: null } }
      }),
      prisma.notice.count({
        where: { deadline: { lt: now } }
      })
    ])

    return {
      total,
      active,
      withDeadlines,
      expired
    }
  }

  /**
   * Get notices for dashboard summary
   */
  static async getDashboardSummary() {
    const stats = await this.getStats()
    const upcomingDeadlines = await this.getUpcomingDeadlines(7)
    const recentNotices = await this.list({ page: 1, limit: 5 })

    return {
      stats,
      upcomingDeadlines: upcomingDeadlines.notices,
      recentNotices: recentNotices.notices
    }
  }

  /**
   * Validate PDF attachment URL
   */
  static isPDFAttachment(url: string): boolean {
    return url.toLowerCase().endsWith('.pdf')
  }

  /**
   * Get PDF attachments for a notice
   */
  static getPDFAttachments(notice: Notice): string[] {
    return notice.attachments.filter(url => this.isPDFAttachment(url))
  }

  /**
   * Get non-PDF attachments for a notice
   */
  static getNonPDFAttachments(notice: Notice): string[] {
    return notice.attachments.filter(url => !this.isPDFAttachment(url))
  }

  /**
   * Check if a notice is expired
   */
  static isExpired(notice: { deadline: Date | null }): boolean {
    if (!notice.deadline) {
      return false
    }
    return notice.deadline < new Date()
  }
}
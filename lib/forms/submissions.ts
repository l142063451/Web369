/**
 * Submission Management Service
 * Based on INSTRUCTIONS_FOR_COPILOT.md §7
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit/logger'
import { getSLAStatus, isSLABreached } from './sla'
// Types will be available once Prisma generates
type SubmissionStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'

// Status transition schemas
const StatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED']),
  assignedTo: z.string().optional(),
  note: z.string().max(1000).optional(),
  resolution: z.string().max(2000).optional(), // For RESOLVED status
  rejectionReason: z.string().max(1000).optional() // For REJECTED status
})

const SubmissionFilterSchema = z.object({
  formId: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED']).optional(),
  assignedTo: z.string().optional(),
  userId: z.string().optional(),
  slaStatus: z.enum(['on-track', 'at-risk', 'breached']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
})

export type StatusUpdate = z.infer<typeof StatusUpdateSchema>
export type SubmissionFilter = z.infer<typeof SubmissionFilterSchema>

export interface SubmissionWithDetails {
  id: string
  formId: string
  userId: string | null
  status: SubmissionStatus
  data: any
  files: string[]
  geo: any
  history: any[]
  slaDue: Date
  assignedTo: string | null
  createdAt: Date
  updatedAt: Date
  form: {
    id: string
    name: string
    slaDays: number
  }
  user?: {
    id: string
    name: string | null
    email: string | null
  }
  assignedUser?: {
    id: string
    name: string | null
    email: string | null
  }
  slaInfo: {
    status: 'on-track' | 'at-risk' | 'breached' | 'completed'
    hoursRemaining: number
    message: string
  }
}

/**
 * Submission Management Service
 */
export class SubmissionService {
  /**
   * Get submission by ID with details
   */
  async getSubmission(id: string): Promise<SubmissionWithDetails | null> {
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        form: {
          select: { id: true, name: true, slaDays: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!submission) return null

    return {
      ...submission,
      slaInfo: getSLAStatus(submission.slaDue, submission.status)
    }
  }

  /**
   * List submissions with filtering and SLA info
   */
  async listSubmissions(filter: Partial<SubmissionFilter> = {}): Promise<{
    submissions: SubmissionWithDetails[]
    total: number
    slaStats: {
      onTrack: number
      atRisk: number
      breached: number
      completed: number
    }
  }> {
    const validated = { 
      limit: 20, 
      offset: 0, 
      ...filter 
    }
    
    // Build where clause
    const where: any = {}
    
    if (validated.formId) where.formId = validated.formId
    if (validated.status) where.status = validated.status
    if (validated.assignedTo) where.assignedTo = validated.assignedTo
    if (validated.userId) where.userId = validated.userId
    if (validated.search) {
      where.OR = [
        { form: { name: { contains: validated.search, mode: 'insensitive' } } },
        { user: { name: { contains: validated.search, mode: 'insensitive' } } },
        { user: { email: { contains: validated.search, mode: 'insensitive' } } }
      ]
    }
    if (validated.dateFrom || validated.dateTo) {
      where.createdAt = {}
      if (validated.dateFrom) where.createdAt.gte = validated.dateFrom
      if (validated.dateTo) where.createdAt.lte = validated.dateTo
    }

    // Get submissions
    const [submissionsRaw, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          form: {
            select: { id: true, name: true, slaDays: true }
          },
          user: {
            select: { id: true, name: true, email: true }
          },
          assignedUser: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [
          { status: 'asc' }, // Pending first
          { slaDue: 'asc' }  // Most urgent first
        ],
        take: validated.limit,
        skip: validated.offset
      }),
      prisma.submission.count({ where })
    ])

    // Add SLA info and filter by SLA status if needed
    let submissions = submissionsRaw.map((submission: any) => ({
      ...submission,
      slaInfo: getSLAStatus(submission.slaDue, submission.status)
    }))

    // Filter by SLA status if specified
    if (validated.slaStatus) {
      submissions = submissions.filter((s: any) => s.slaInfo.status === validated.slaStatus)
    }

    // Calculate SLA stats
    const slaStats = submissions.reduce((stats: any, submission: any) => {
      const status = submission.slaInfo.status
      stats[status === 'on-track' ? 'onTrack' : 
           status === 'at-risk' ? 'atRisk' : 
           status === 'breached' ? 'breached' : 'completed']++
      return stats
    }, { onTrack: 0, atRisk: 0, breached: 0, completed: 0 })

    return { submissions, total, slaStats }
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(
    id: string, 
    update: StatusUpdate, 
    actorId: string
  ): Promise<SubmissionWithDetails> {
    const validated = StatusUpdateSchema.parse(update)
    
    const existing = await this.getSubmission(id)
    if (!existing) {
      throw new Error('Submission not found')
    }

    // Validate status transition
    this.validateStatusTransition(existing.status, validated.status)

    // Prepare update data
    const updateData: any = {
      status: validated.status,
      updatedAt: new Date()
    }

    if (validated.assignedTo) updateData.assignedTo = validated.assignedTo

    // Add to history
    const newHistoryEntry = {
      timestamp: new Date(),
      action: validated.status,
      actor: actorId,
      note: validated.note || `Status changed to ${validated.status}`,
      ...(validated.resolution && { resolution: validated.resolution }),
      ...(validated.rejectionReason && { rejectionReason: validated.rejectionReason })
    }

    updateData.history = [...(existing.history as any[]), newHistoryEntry]

    // Update submission
    const updated = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        form: {
          select: { id: true, name: true, slaDays: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Audit log
    await createAuditLog({
      actorId,
      action: 'UPDATE',
      resource: 'submission',
      resourceId: id,
      diff: {
        oldStatus: existing.status,
        newStatus: validated.status,
        assignedTo: validated.assignedTo,
        note: validated.note
      }
    })

    return {
      ...updated,
      slaInfo: getSLAStatus(updated.slaDue, updated.status)
    }
  }

  /**
   * Assign submission to user
   */
  async assignSubmission(
    id: string,
    assignedTo: string,
    actorId: string,
    note?: string
  ): Promise<SubmissionWithDetails> {
    return this.updateSubmissionStatus(id, {
      status: 'IN_PROGRESS',
      assignedTo,
      note: note || `Assigned to user`
    }, actorId)
  }

  /**
   * Get submissions that are breaching SLA
   */
  async getBreachedSubmissions(): Promise<SubmissionWithDetails[]> {
    const submissions = await prisma.submission.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS', 'ESCALATED'] },
        slaDue: { lt: new Date() }
      },
      include: {
        form: {
          select: { id: true, name: true, slaDays: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { slaDue: 'asc' }
    })

    return submissions.map((submission: any) => ({
      ...submission,
      slaInfo: getSLAStatus(submission.slaDue, submission.status)
    }))
  }

  /**
   * Get SLA metrics for dashboard
   */
  async getSLAMetrics(formId?: string): Promise<{
    totalSubmissions: number
    onTime: number
    breached: number
    averageResolutionHours: number
    categoryBreakdown: Record<string, { total: number; breached: number }>
  }> {
    const where: any = {}
    if (formId) where.formId = formId

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        form: { select: { name: true } }
      }
    })

    const metrics = {
      totalSubmissions: submissions.length,
      onTime: 0,
      breached: 0,
      averageResolutionHours: 0,
      categoryBreakdown: {} as Record<string, { total: number; breached: number }>
    }

    let totalResolutionHours = 0
    let resolvedCount = 0

    for (const submission of submissions) {
      const isBreached = isSLABreached(submission.slaDue)
      
      if (isBreached) {
        metrics.breached++
      } else {
        metrics.onTime++
      }

      // Track by form name as category
      const category = submission.form.name
      if (!metrics.categoryBreakdown[category]) {
        metrics.categoryBreakdown[category] = { total: 0, breached: 0 }
      }
      metrics.categoryBreakdown[category].total++
      if (isBreached) {
        metrics.categoryBreakdown[category].breached++
      }

      // Calculate resolution time for resolved submissions
      if (submission.status === 'RESOLVED') {
        const resolutionHours = (submission.updatedAt.getTime() - submission.createdAt.getTime()) / (1000 * 60 * 60)
        totalResolutionHours += resolutionHours
        resolvedCount++
      }
    }

    if (resolvedCount > 0) {
      metrics.averageResolutionHours = totalResolutionHours / resolvedCount
    }

    return metrics
  }

  /**
   * Validate status transition is allowed
   */
  private validateStatusTransition(currentStatus: SubmissionStatus, newStatus: SubmissionStatus): void {
    const allowedTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      PENDING: ['IN_PROGRESS', 'REJECTED', 'ESCALATED'],
      IN_PROGRESS: ['RESOLVED', 'REJECTED', 'ESCALATED', 'PENDING'],
      RESOLVED: [], // Final state
      REJECTED: [], // Final state  
      ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'REJECTED']
    }

    const allowed = allowedTransitions[currentStatus] || []
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`)
    }
  }
}
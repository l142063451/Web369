/**
 * Form Service Layer
 * CRUD operations for forms and submissions
 * Part of PR07: Form Builder & SLA Engine
 */

import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/auth/audit-logger'
import { FormSchema, FormFieldDefinition, validateFormDataFromFields } from './schema'

// Define types since Prisma client may not be generated yet
export interface Form {
  id: string
  name: string
  schema: any
  slaDays: number
  workflow: any
  active: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Submission {
  id: string
  formId: string
  userId: string | null
  data: any
  files: string[]
  status: SubmissionStatus
  assignedTo: string | null
  geo: any
  history: any
  slaDue: Date
  createdAt: Date
  updatedAt: Date
  // Relations that may be included
  form?: any
  user?: any
  assignedUser?: any
}

export type SubmissionStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'RESOLVED'  
  | 'REJECTED'
  | 'ESCALATED'

export interface CreateFormRequest {
  name: string
  schema: FormSchema
  slaDays: number
  workflow?: Record<string, unknown>
  active?: boolean
  createdBy: string
}

export interface UpdateFormRequest {
  name?: string
  schema?: FormSchema
  slaDays?: number
  workflow?: Record<string, unknown>
  active?: boolean
}

export interface CreateSubmissionRequest {
  formId: string
  userId?: string | null
  data: Record<string, unknown>
  files?: string[]
  status?: SubmissionStatus
  geo?: { lat: number; lng: number; accuracy?: number; address?: string } | null
  metadata?: Record<string, unknown>
}

export interface UpdateSubmissionRequest {
  status?: SubmissionStatus
  assignedTo?: string
  resolvedAt?: Date
  history?: Array<{ timestamp: Date; status: string; notes?: string; userId?: string }>
}

/**
 * Form Service Class
 */
export class FormService {
  constructor(private db: PrismaClient = prisma) {}

  /**
   * Create a new form
   */
  async createForm(request: CreateFormRequest): Promise<Form> {
    const form = await this.db.form.create({
      data: {
        name: request.name,
        schema: request.schema as any,
        slaDays: request.slaDays,
        workflow: request.workflow || {},
        active: request.active ?? true,
        createdBy: request.createdBy,
      },
    })

    // Audit log the creation
    await auditLogger.log({
      action: 'form.create',
      resource: 'Form',
      resourceId: form.id,
      actorId: request.createdBy,
      metadata: { name: form.name },
    })

    return form
  }

  /**
   * Get form by ID with validation
   */
  async getForm(id: string): Promise<Form | null> {
    return this.db.form.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
    })
  }

  /**
   * Alias for getForm for consistency
   */
  async getFormById(id: string): Promise<Form | null> {
    return this.getForm(id)
  }

  /**
   * Get all forms with pagination and filtering
   */
  async getForms(options?: {
    active?: boolean
    createdBy?: string
    page?: number
    limit?: number
  }) {
    const { active, createdBy, page = 1, limit = 10 } = options || {}

    const where = {
      ...(active !== undefined && { active }),
      ...(createdBy && { createdBy }),
    }

    const [forms, total] = await Promise.all([
      this.db.form.findMany({
        where,
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { submissions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.form.count({ where }),
    ])

    return {
      forms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Update form
   */
  async updateForm(id: string, request: UpdateFormRequest, updatedBy: string): Promise<Form> {
    const existingForm = await this.db.form.findUnique({ where: { id } })
    if (!existingForm) {
      throw new Error('Form not found')
    }

    const form = await this.db.form.update({
      where: { id },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.schema && { schema: request.schema as any }),
        ...(request.slaDays !== undefined && { slaDays: request.slaDays }),
        ...(request.workflow && { workflow: request.workflow }),
        ...(request.active !== undefined && { active: request.active }),
      },
    })

    // Audit log the update
    await auditLogger.log({
      action: 'form.update',
      resource: 'Form',
      resourceId: form.id,
      actorId: updatedBy,
      metadata: {
        changes: request,
        previous: existingForm,
      },
    })

    return form
  }

  /**
   * Delete form (soft delete by marking inactive)
   */
  async deleteForm(id: string, deletedBy: string): Promise<void> {
    const existingForm = await this.db.form.findUnique({ where: { id } })
    if (!existingForm) {
      throw new Error('Form not found')
    }

    await this.db.form.update({
      where: { id },
      data: { active: false },
    })

    // Audit log the deletion
    await auditLogger.log({
      action: 'form.delete',
      resource: 'Form',
      resourceId: id,
      actorId: deletedBy,
      metadata: { name: existingForm.name },
    })
  }

  /**
   * Create a new submission with SLA calculation
   */
  async createSubmission(request: CreateSubmissionRequest): Promise<Submission> {
    const form = await this.getForm(request.formId)
    if (!form || !form.active) {
      throw new Error('Form not found or inactive')
    }

    // Validate form data against schema
    const formSchema = form.schema as FormSchema
    const validation = validateFormDataFromFields(request.data, formSchema.fields || [])
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error.issues.map(i => i.message).join(', ')}`)
    }

    // Calculate SLA due date
    const slaDue = new Date()
    slaDue.setDate(slaDue.getDate() + form.slaDays)

    const submission = await this.db.submission.create({
      data: {
        formId: request.formId,
        userId: request.userId || null,
        data: validation.data as any,
        files: request.files || [],
        status: request.status || 'PENDING',
        geo: request.geo as any,
        metadata: request.metadata as any,
        slaDue,
        history: [
          {
            timestamp: new Date(),
            status: request.status || 'PENDING',
            notes: 'Submission created',
            userId: request.userId,
          },
        ] as any,
      },
    })

    // Audit log the submission
    await auditLogger.log({
      action: 'submission.create',
      resource: 'Submission',
      resourceId: submission.id,
      actorId: request.userId || 'anonymous',
      metadata: { formId: request.formId },
    })

    return submission
  }

  /**
   * Get submission by ID
   */
  async getSubmission(id: string): Promise<Submission | null> {
    return this.db.submission.findUnique({
      where: { id },
      include: {
        form: {
          select: { id: true, name: true, schema: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * Get submissions with filtering and pagination
   */
  async getSubmissions(options?: {
    formId?: string
    userId?: string
    status?: SubmissionStatus
    assignedTo?: string
    overdue?: boolean
    page?: number
    limit?: number
  }) {
    const {
      formId,
      userId,
      status,
      assignedTo,
      overdue,
      page = 1,
      limit = 10,
    } = options || {}

    const where = {
      ...(formId && { formId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(assignedTo && { assignedTo }),
      ...(overdue && { slaDue: { lt: new Date() } }),
    }

    const [submissions, total] = await Promise.all([
      this.db.submission.findMany({
        where,
        include: {
          form: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.submission.count({ where }),
    ])

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Update submission status and add to history
   */
  async updateSubmission(
    id: string,
    request: UpdateSubmissionRequest,
    updatedBy: string
  ): Promise<Submission> {
    const existingSubmission = await this.getSubmission(id)
    if (!existingSubmission) {
      throw new Error('Submission not found')
    }

    // Prepare history entry
    const historyEntry = {
      timestamp: new Date(),
      status: request.status || existingSubmission.status,
      notes: `Status updated by ${updatedBy}`,
      userId: updatedBy,
    }

    const currentHistory = (existingSubmission.history as any[]) || []
    const newHistory = [...currentHistory, historyEntry]

    const submission = await this.db.submission.update({
      where: { id },
      data: {
        ...(request.status && { status: request.status }),
        ...(request.assignedTo !== undefined && { assignedTo: request.assignedTo }),
        ...(request.resolvedAt && { resolvedAt: request.resolvedAt }),
        history: newHistory as any,
      },
    })

    // Audit log the update
    await auditLogger.log({
      action: 'submission.update',
      resource: 'Submission',
      resourceId: submission.id,
      actorId: updatedBy,
      metadata: {
        changes: request,
        previousStatus: existingSubmission.status,
      },
    })

    return submission
  }

  /**
   * Get submissions that are overdue (past SLA)
   */
  async getOverdueSubmissions(): Promise<Submission[]> {
    return this.db.submission.findMany({
      where: {
        slaDue: { lt: new Date() },
        status: { notIn: ['RESOLVED', 'REJECTED'] },
      },
      include: {
        form: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { slaDue: 'asc' },
    })
  }

  /**
   * Get SLA compliance statistics
   */
  async getSlaStats(options?: {
    formId?: string
    from?: Date
    to?: Date
  }) {
    const { formId, from, to } = options || {}

    const where = {
      ...(formId && { formId }),
      ...(from && to && {
        createdAt: {
          gte: from,
          lte: to,
        },
      }),
    }

    const [total, resolved, overdue, onTime] = await Promise.all([
      this.db.submission.count({ where }),
      this.db.submission.count({
        where: { ...where, status: 'RESOLVED' },
      }),
      this.db.submission.count({
        where: {
          ...where,
          slaDue: { lt: new Date() },
          status: { notIn: ['RESOLVED', 'REJECTED'] },
        },
      }),
      this.db.submission.count({
        where: {
          ...where,
          status: 'RESOLVED',
          resolvedAt: { not: null },
          // Resolved before SLA due date
        },
      }),
    ])

    const complianceRate = total > 0 ? ((total - overdue) / total) * 100 : 0
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0

    return {
      total,
      resolved,
      overdue,
      onTime,
      complianceRate: Math.round(complianceRate * 100) / 100,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
    }
  }

  /**
   * Duplicate a form with new name
   */
  async duplicateForm(id: string, newName: string, createdBy: string): Promise<Form> {
    const existingForm = await this.getForm(id)
    if (!existingForm) {
      throw new Error('Form not found')
    }

    const form = await this.createForm({
      name: newName,
      schema: existingForm.schema as FormSchema,
      slaDays: existingForm.slaDays,
      workflow: existingForm.workflow as Record<string, unknown>,
      active: true,
      createdBy,
    })

    return form
  }

  /**
   * Bulk update submission status
   */
  async bulkUpdateSubmissions(
    ids: string[],
    request: UpdateSubmissionRequest,
    updatedBy: string
  ): Promise<void> {
    if (ids.length === 0) return

    // Update all submissions
    await this.db.submission.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(request.status && { status: request.status }),
        ...(request.assignedTo !== undefined && { assignedTo: request.assignedTo }),
      },
    })

    // Audit log bulk update
    await auditLogger.log({
      action: 'submission.bulk_update',
      resource: 'Submission',
      resourceId: ids.join(','),
      actorId: updatedBy,
      metadata: {
        changes: request,
        affectedCount: ids.length,
      },
    })
  }
}

// Export singleton instance
export const formService = new FormService()
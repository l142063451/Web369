/**
 * Form Builder Service Layer
 * Based on INSTRUCTIONS_FOR_COPILOT.md §7 and REQUIREMENTS_AND_GOALS.md §8
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit/logger'
import { calculateSLADue } from './sla'
// Types will be available once Prisma generates
type SubmissionStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'

interface Form {
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

interface Submission {
  id: string
  formId: string
  userId: string | null
  data: any
  files: string[]
  status: SubmissionStatus
  assignedTo: string | null
  geo: any
  history: any[]
  slaDue: Date
  createdAt: Date
  updatedAt: Date
}

// Form Field Types
export const FormFieldTypes = [
  'text',
  'email', 
  'phone',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'file',
  'date',
  'number',
  'url',
  'location'  // For geo coordinates
] as const

export type FormFieldType = typeof FormFieldTypes[number]

// Form Field Schema
export const FormFieldSchema = z.object({
  id: z.string(),
  type: z.enum(FormFieldTypes),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  required: z.boolean().default(false),
  validation: z.object({
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.object({
      value: z.string(),
      label: z.string()
    })).optional(),
  }).optional(),
  conditionalLogic: z.object({
    showWhen: z.object({
      fieldId: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
      value: z.union([z.string(), z.number(), z.boolean()])
    })
  }).optional(),
  order: z.number().min(0)
})

export type FormField = z.infer<typeof FormFieldSchema>

// Complete Form Schema
export const FormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  fields: z.array(FormFieldSchema).min(1),
  settings: z.object({
    allowAnonymous: z.boolean().default(true),
    requireAuth: z.boolean().default(false),
    enableCaptcha: z.boolean().default(true),
    enableGeolocation: z.boolean().default(false),
    confirmationMessage: z.string().max(500).optional(),
    redirectUrl: z.string().url().optional(),
    notifyOnSubmission: z.boolean().default(true),
    notifyEmails: z.array(z.string().email()).default([]),
  }).optional(),
  slaDays: z.number().min(1).max(365).default(7),
  workflow: z.object({
    autoAssignment: z.object({
      enabled: z.boolean().default(false),
      rules: z.array(z.object({
        condition: z.string(),
        assignTo: z.string()
      })).default([])
    }).optional(),
    approvalRequired: z.boolean().default(false),
    escalationRules: z.array(z.object({
      afterDays: z.number().min(1),
      action: z.enum(['notify', 'reassign', 'escalate']),
      target: z.string()
    })).default([])
  }).optional()
})

export type FormDefinition = z.infer<typeof FormSchema>

// Submission Data Schema  
export const SubmissionDataSchema = z.object({
  formId: z.string(),
  data: z.record(z.unknown()),
  files: z.array(z.string()).default([]),
  geo: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).optional(),
    address: z.string().optional()
  }).optional(),
  turnstileToken: z.string().optional()
})

export type SubmissionData = z.infer<typeof SubmissionDataSchema>

/**
 * Form Builder Service
 */
export class FormService {
  /**
   * Create new form
   */
  async createForm(formData: FormDefinition, createdBy: string): Promise<Form> {
    const validated = FormSchema.parse(formData)
    
    // Create form in database
    const form = await prisma.form.create({
      data: {
        name: validated.name,
        schema: {
          description: validated.description,
          fields: validated.fields,
          settings: validated.settings || {}
        },
        slaDays: validated.slaDays,
        workflow: validated.workflow || {},
        createdBy,
      }
    })

    // Audit log
    await createAuditLog({
      actorId: createdBy,
      action: 'CREATE',
      resource: 'form',
      resourceId: form.id,
      diff: { name: validated.name, fieldsCount: validated.fields.length }
    })

    return form
  }

  /**
   * Update existing form
   */
  async updateForm(id: string, formData: Partial<FormDefinition>, updatedBy: string): Promise<Form> {
    const existing = await prisma.form.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } }
    })
    
    if (!existing) {
      throw new Error('Form not found')
    }

    // If form has submissions, create new version instead of updating
    if (existing._count.submissions > 0) {
      throw new Error('Cannot modify form with existing submissions. Create a new version instead.')
    }

    const updateData: any = {}
    
    if (formData.name) updateData.name = formData.name
    if (formData.slaDays) updateData.slaDays = formData.slaDays
    if (formData.workflow) updateData.workflow = formData.workflow
    
    if (formData.fields || formData.description || formData.settings) {
      updateData.schema = {
        ...(existing.schema as any),
        ...(formData.description && { description: formData.description }),
        ...(formData.fields && { fields: formData.fields }),
        ...(formData.settings && { settings: formData.settings })
      }
    }

    const updated = await prisma.form.update({
      where: { id },
      data: updateData
    })

    // Audit log
    await createAuditLog({
      actorId: updatedBy,
      action: 'UPDATE', 
      resource: 'form',
      resourceId: id,
      diff: { changes: Object.keys(updateData) }
    })

    return updated
  }

  /**
   * Get form by ID
   */
  async getForm(id: string, includeInactive = false): Promise<Form | null> {
    return prisma.form.findUnique({
      where: { 
        id,
        ...(includeInactive ? {} : { active: true })
      }
    })
  }

  /**
   * List forms with filtering
   */
  async listForms(options: {
    active?: boolean
    search?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ forms: Form[], total: number }> {
    const { active = true, search, limit = 20, offset = 0 } = options

    const where: any = { active }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [forms, total] = await Promise.all([
      prisma.form.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: { select: { submissions: true } }
        }
      }),
      prisma.form.count({ where })
    ])

    return { forms, total }
  }

  /**
   * Delete form (soft delete - set inactive)
   */
  async deleteForm(id: string, deletedBy: string): Promise<void> {
    const form = await prisma.form.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } }
    })
    
    if (!form) {
      throw new Error('Form not found')
    }

    // If has submissions, only deactivate
    await prisma.form.update({
      where: { id },
      data: { active: false }
    })

    // Audit log
    await createAuditLog({
      actorId: deletedBy,
      action: 'DELETE',
      resource: 'form', 
      resourceId: id,
      diff: { 
        name: form.name,
        submissionsCount: form._count.submissions,
        action: 'deactivated'
      }
    })
  }

  /**
   * Submit form data
   */
  async submitForm(submissionData: SubmissionData, userId?: string): Promise<Submission> {
    const validated = SubmissionDataSchema.parse(submissionData)
    
    // Get form and validate
    const form = await this.getForm(validated.formId)
    if (!form) {
      throw new Error('Form not found or inactive')
    }

    const formSchema = form.schema as any
    
    // Validate form data against schema
    await this.validateSubmissionData(validated.data, formSchema.fields)

    // Calculate SLA due date
    const slaDue = calculateSLADue(form.slaDays)

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        formId: validated.formId,
        userId,
        data: validated.data,
        files: validated.files,
        geo: validated.geo,
        slaDue,
        history: [{
          timestamp: new Date(),
          action: 'SUBMITTED',
          actor: userId || 'anonymous',
          note: 'Form submitted'
        }]
      }
    })

    // Audit log
    await createAuditLog({
      actorId: userId || 'anonymous',
      action: 'CREATE',
      resource: 'submission',
      resourceId: submission.id,
      diff: { formId: validated.formId, hasFiles: validated.files.length > 0 }
    })

    // TODO: Queue notification job
    // TODO: Apply auto-assignment rules

    return submission
  }

  /**
   * Validate submission data against form fields
   */
  private async validateSubmissionData(data: Record<string, unknown>, fields: FormField[]): Promise<void> {
    for (const field of fields) {
      const value = data[field.id]

      // Required field check
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new Error(`Field "${field.label}" is required`)
      }

      // Skip validation if field is empty and not required
      if (value === undefined || value === null || value === '') {
        continue
      }

      // Type-specific validation
      await this.validateFieldValue(field, value)
    }
  }

  /**
   * Validate individual field value
   */
  private async validateFieldValue(field: FormField, value: unknown): Promise<void> {
    const validation = field.validation

    switch (field.type) {
      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          throw new Error(`Field "${field.label}" must be text`)
        }
        if (validation?.minLength && value.length < validation.minLength) {
          throw new Error(`Field "${field.label}" must be at least ${validation.minLength} characters`)
        }
        if (validation?.maxLength && value.length > validation.maxLength) {
          throw new Error(`Field "${field.label}" must be at most ${validation.maxLength} characters`)
        }
        if (validation?.pattern && !new RegExp(validation.pattern).test(value)) {
          throw new Error(`Field "${field.label}" format is invalid`)
        }
        break

      case 'email':
        if (typeof value !== 'string' || !z.string().email().safeParse(value).success) {
          throw new Error(`Field "${field.label}" must be a valid email`)
        }
        break

      case 'phone':
        if (typeof value !== 'string' || !/^\+?[\d\s\-\(\)]{10,}$/.test(value)) {
          throw new Error(`Field "${field.label}" must be a valid phone number`)
        }
        break

      case 'number':
        const num = Number(value)
        if (isNaN(num)) {
          throw new Error(`Field "${field.label}" must be a number`)
        }
        if (validation?.min !== undefined && num < validation.min) {
          throw new Error(`Field "${field.label}" must be at least ${validation.min}`)
        }
        if (validation?.max !== undefined && num > validation.max) {
          throw new Error(`Field "${field.label}" must be at most ${validation.max}`)
        }
        break

      case 'select':
      case 'radio':
        if (validation?.options) {
          const validValues = validation.options.map(opt => opt.value)
          if (!validValues.includes(value as string)) {
            throw new Error(`Field "${field.label}" has invalid option`)
          }
        }
        break

      case 'checkbox':
        if (!Array.isArray(value)) {
          throw new Error(`Field "${field.label}" must be an array`)
        }
        if (validation?.options) {
          const validValues = validation.options.map(opt => opt.value)
          for (const val of value) {
            if (!validValues.includes(val as string)) {
              throw new Error(`Field "${field.label}" has invalid option`)
            }
          }
        }
        break
        
      case 'date':
        if (typeof value !== 'string' || isNaN(Date.parse(value))) {
          throw new Error(`Field "${field.label}" must be a valid date`)
        }
        break

      case 'url':
        if (!z.string().url().safeParse(value).success) {
          throw new Error(`Field "${field.label}" must be a valid URL`)
        }
        break

      case 'location':
        if (typeof value !== 'object' || !value) {
          throw new Error(`Field "${field.label}" must be a location object`)
        }
        const loc = value as any
        if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
          throw new Error(`Field "${field.label}" must have valid coordinates`)
        }
        break

      case 'file':
        if (!Array.isArray(value)) {
          throw new Error(`Field "${field.label}" must be an array of file URLs`)
        }
        // File validation would be done during upload
        break
    }
  }
}
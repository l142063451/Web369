/**
 * Dynamic Form Schema Generation
 * Converts JSON field descriptors to Zod schemas for runtime validation
 * Part of PR07: Form Builder & SLA Engine
 */

import { z } from 'zod'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'date'
  | 'time'
  | 'datetime'
  | 'url'
  | 'boolean'
  | 'geo'

export interface FormFieldDefinition {
  id: string
  type: FieldType
  label: string
  description?: string
  required: boolean
  placeholder?: string
  defaultValue?: unknown
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    custom?: string[] // Custom validation rules
  }
  options?: Array<{ label: string; value: string }> // For select, radio
  conditional?: {
    field: string // Field ID this depends on
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains'
    value: unknown
  }
  fileConstraints?: {
    maxSize: number // in bytes
    allowedTypes: string[] // MIME types
    multiple: boolean
  }
}

export interface FormSchema {
  id: string
  title: string
  description?: string
  fields: FormFieldDefinition[]
  settings: {
    category: string
    slaDays: number
    requiresAuth: boolean
    allowAnonymous: boolean
    notificationTemplate?: string
    redirectUrl?: string
  }
}

/**
 * Convert a field definition to a Zod schema
 */
export function fieldToZodSchema(field: FormFieldDefinition): z.ZodType<unknown> {
  let schema: z.ZodType<unknown>

  switch (field.type) {
    case 'text':
    case 'textarea':
      schema = z.string()
      if (field.validation?.minLength) {
        schema = (schema as z.ZodString).min(field.validation.minLength)
      }
      if (field.validation?.maxLength) {
        schema = (schema as z.ZodString).max(field.validation.maxLength)
      }
      if (field.validation?.pattern) {
        schema = (schema as z.ZodString).regex(new RegExp(field.validation.pattern))
      }
      break

    case 'email':
      schema = z.string().email()
      break

    case 'phone':
      // Indian phone number validation
      schema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number')
      break

    case 'number':
      schema = z.number()
      if (field.validation?.min !== undefined) {
        schema = (schema as z.ZodNumber).min(field.validation.min)
      }
      if (field.validation?.max !== undefined) {
        schema = (schema as z.ZodNumber).max(field.validation.max)
      }
      break

    case 'url':
      schema = z.string().url()
      break

    case 'date':
      schema = z.string().datetime() // ISO date string
      break

    case 'time':
      schema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
      break

    case 'datetime':
      schema = z.string().datetime()
      break

    case 'select':
    case 'radio':
      if (field.options?.length) {
        const validValues = field.options.map(opt => opt.value)
        schema = z.enum(validValues as [string, ...string[]])
      } else {
        schema = z.string()
      }
      break

    case 'checkbox':
      if (field.options?.length) {
        // Multiple checkbox values
        const validValues = field.options.map(opt => opt.value)
        schema = z.array(z.enum(validValues as [string, ...string[]]))
      } else {
        // Single boolean checkbox
        schema = z.boolean()
      }
      break

    case 'boolean':
      schema = z.boolean()
      break

    case 'file':
      // File upload - validate file metadata
      schema = z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        url: z.string().url().optional(), // After upload
      })
      
      if (field.fileConstraints?.maxSize) {
        schema = (schema as z.ZodObject<any>).refine(
          (file: any) => file.size <= field.fileConstraints!.maxSize,
          `File size must be less than ${field.fileConstraints.maxSize} bytes`
        )
      }
      
      if (field.fileConstraints?.allowedTypes?.length) {
        schema = (schema as z.ZodObject<any>).refine(
          (file: any) => field.fileConstraints!.allowedTypes.includes(file.type),
          `File type must be one of: ${field.fileConstraints.allowedTypes.join(', ')}`
        )
      }
      break

    case 'geo':
      schema = z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        address: z.string().optional(),
      })
      break

    default:
      schema = z.string()
      break
  }

  // Make field optional if not required
  if (!field.required) {
    schema = schema.optional()
  }

  return schema
}

/**
 * Generate a complete Zod schema for a form
 */
export function formToZodSchema(formSchema: FormSchema): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodType<unknown>> = {}

  for (const field of formSchema.fields) {
    schemaFields[field.id] = fieldToZodSchema(field)
  }

  return z.object(schemaFields)
}

/**
 * Generate Zod schema from field definitions
 */
export function generateZodSchema(fields: FormFieldDefinition[]): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodType<unknown>> = {}

  for (const field of fields) {
    schemaFields[field.id] = fieldToZodSchema(field)
  }

  return z.object(schemaFields)
}

/**
 * Validate form data against schema
 */
export function validateFormData(formSchema: FormSchema, data: Record<string, unknown>) {
  const zodSchema = formToZodSchema(formSchema)
  return zodSchema.safeParse(data)
}

/**
 * Validate form data against field definitions
 */
export function validateFormDataFromFields(data: Record<string, unknown>, fields: FormFieldDefinition[]) {
  const zodSchema = generateZodSchema(fields)
  return zodSchema.safeParse(data)
}

/**
 * Check if field should be visible based on conditional logic
 */
export function isFieldVisible(
  field: FormFieldDefinition,
  formData: Record<string, unknown>
): boolean {
  if (!field.conditional) return true

  const { field: dependentField, operator, value } = field.conditional
  const dependentValue = formData[dependentField]

  switch (operator) {
    case 'equals':
      return dependentValue === value
    case 'not_equals':
      return dependentValue !== value
    case 'contains':
      return String(dependentValue).includes(String(value))
    case 'not_contains':
      return !String(dependentValue).includes(String(value))
    default:
      return true
  }
}

/**
 * Get default form schema for common form types
 */
export function getDefaultFormSchema(type: 'complaint' | 'suggestion' | 'rti'): Partial<FormSchema> {
  const baseFields: FormFieldDefinition[] = [
    {
      id: 'name',
      type: 'text',
      label: 'Full Name',
      required: true,
      validation: { minLength: 2, maxLength: 100 }
    },
    {
      id: 'email',
      type: 'email',
      label: 'Email Address',
      required: true
    },
    {
      id: 'phone',
      type: 'phone',
      label: 'Phone Number',
      required: true
    }
  ]

  switch (type) {
    case 'complaint':
      return {
        title: 'Complaint Form',
        description: 'Submit your complaint and track its progress',
        fields: [
          ...baseFields,
          {
            id: 'category',
            type: 'select',
            label: 'Complaint Category',
            required: true,
            options: [
              { label: 'Water Supply', value: 'water' },
              { label: 'Roads & Infrastructure', value: 'roads' },
              { label: 'Electricity', value: 'electricity' },
              { label: 'Sanitation', value: 'sanitation' },
              { label: 'Other', value: 'other' }
            ]
          },
          {
            id: 'description',
            type: 'textarea',
            label: 'Complaint Description',
            required: true,
            validation: { minLength: 10, maxLength: 1000 }
          },
          {
            id: 'location',
            type: 'geo',
            label: 'Location (Optional)',
            required: false
          },
          {
            id: 'attachments',
            type: 'file',
            label: 'Supporting Documents/Photos',
            required: false,
            fileConstraints: {
              maxSize: 5 * 1024 * 1024, // 5MB
              allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
              multiple: true
            }
          }
        ],
        settings: {
          category: 'complaint',
          slaDays: 14,
          requiresAuth: false,
          allowAnonymous: true,
          notificationTemplate: 'complaint_received'
        }
      }

    case 'suggestion':
      return {
        title: 'Suggestion Form',
        description: 'Share your ideas for village improvement',
        fields: [
          ...baseFields,
          {
            id: 'title',
            type: 'text',
            label: 'Suggestion Title',
            required: true,
            validation: { minLength: 5, maxLength: 200 }
          },
          {
            id: 'description',
            type: 'textarea',
            label: 'Detailed Description',
            required: true,
            validation: { minLength: 20, maxLength: 2000 }
          },
          {
            id: 'category',
            type: 'select',
            label: 'Category',
            required: true,
            options: [
              { label: 'Infrastructure', value: 'infrastructure' },
              { label: 'Environment', value: 'environment' },
              { label: 'Community Programs', value: 'community' },
              { label: 'Technology', value: 'technology' },
              { label: 'Other', value: 'other' }
            ]
          }
        ],
        settings: {
          category: 'suggestion',
          slaDays: 30,
          requiresAuth: false,
          allowAnonymous: true,
          notificationTemplate: 'suggestion_received'
        }
      }

    case 'rti':
      return {
        title: 'RTI Request Form',
        description: 'Right to Information request submission',
        fields: [
          ...baseFields,
          {
            id: 'information_sought',
            type: 'textarea',
            label: 'Information Sought',
            required: true,
            validation: { minLength: 10, maxLength: 2000 }
          },
          {
            id: 'period_of_information',
            type: 'text',
            label: 'Period of Information',
            required: true,
            placeholder: 'e.g., 2023-2024'
          },
          {
            id: 'fee_payment',
            type: 'boolean',
            label: 'I am willing to pay the prescribed fee',
            required: true
          }
        ],
        settings: {
          category: 'rti',
          slaDays: 30,
          requiresAuth: true,
          allowAnonymous: false,
          notificationTemplate: 'rti_received'
        }
      }

    default:
      return {
        title: 'Contact Form',
        fields: baseFields,
        settings: {
          category: 'general',
          slaDays: 7,
          requiresAuth: false,
          allowAnonymous: true
        }
      }
  }
}
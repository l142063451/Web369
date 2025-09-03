/**
 * Form Builder & SLA Engine Tests
 * Comprehensive test suite for PR07 implementation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock the database and dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    form: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    submission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/audit-logger', () => ({
  auditLogger: {
    log: jest.fn(),
  },
}))

// Import after mocking
import { FormService } from '@/lib/forms/service'
import { SlaEngine } from '@/lib/forms/sla'
import { 
  FormSchema, 
  formToZodSchema, 
  validateFormData,
  isFieldVisible,
  getDefaultFormSchema
} from '@/lib/forms/schema'

describe('Form Schema System', () => {
  describe('formToZodSchema', () => {
    it('should generate valid Zod schema from form definition', () => {
      const formSchema: FormSchema = {
        id: 'test-form',
        title: 'Test Form',
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Name',
            required: true,
            validation: { minLength: 2, maxLength: 50 }
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email',
            required: true
          },
          {
            id: 'age',
            type: 'number',
            label: 'Age',
            required: false,
            validation: { min: 18, max: 120 }
          }
        ],
        settings: {
          category: 'general',
          slaDays: 7,
          requiresAuth: false,
          allowAnonymous: true
        }
      }

      const zodSchema = formToZodSchema(formSchema)
      expect(zodSchema).toBeDefined()

      // Test valid data
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      }
      const result = zodSchema.safeParse(validData)
      expect(result.success).toBe(true)

      // Test invalid data
      const invalidData = {
        name: 'J', // Too short
        email: 'invalid-email',
        age: 15 // Too young
      }
      const invalidResult = zodSchema.safeParse(invalidData)
      expect(invalidResult.success).toBe(false)
    })

    it('should handle conditional fields correctly', () => {
      const formSchema: FormSchema = {
        id: 'conditional-form',
        title: 'Conditional Form',
        fields: [
          {
            id: 'hasComplaint',
            type: 'boolean',
            label: 'Do you have a complaint?',
            required: true
          },
          {
            id: 'complaintDetails',
            type: 'textarea',
            label: 'Complaint Details',
            required: true,
            conditional: {
              field: 'hasComplaint',
              operator: 'equals',
              value: true
            }
          }
        ],
        settings: {
          category: 'complaint',
          slaDays: 14,
          requiresAuth: false,
          allowAnonymous: true
        }
      }

      const formData = { hasComplaint: true }
      const complaintField = formSchema.fields[1]
      
      expect(isFieldVisible(complaintField, formData)).toBe(true)

      const formDataFalse = { hasComplaint: false }
      expect(isFieldVisible(complaintField, formDataFalse)).toBe(false)
    })
  })

  describe('validateFormData', () => {
    it('should validate form data successfully', () => {
      const schema = getDefaultFormSchema('complaint')
      const validData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '9876543210',
        category: 'water',
        description: 'Water supply issue in my area'
      }

      const result = validateFormData(schema as FormSchema, validData)
      expect(result.success).toBe(true)
    })

    it('should fail validation for missing required fields', () => {
      const schema = getDefaultFormSchema('complaint')
      const invalidData = {
        name: 'Jane Smith'
        // Missing required email, phone, category, description
      }

      const result = validateFormData(schema as FormSchema, invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('getDefaultFormSchema', () => {
    it('should return complaint form schema', () => {
      const schema = getDefaultFormSchema('complaint')
      
      expect(schema.title).toBe('Complaint Form')
      expect(schema.fields).toBeDefined()
      expect(schema.fields!.length).toBeGreaterThan(0)
      expect(schema.settings?.category).toBe('complaint')
      expect(schema.settings?.slaDays).toBe(14)
    })

    it('should return RTI form schema', () => {
      const schema = getDefaultFormSchema('rti')
      
      expect(schema.title).toBe('RTI Request Form')
      expect(schema.fields).toBeDefined()
      expect(schema.settings?.category).toBe('rti')
      expect(schema.settings?.slaDays).toBe(30)
      expect(schema.settings?.requiresAuth).toBe(true)
    })
  })
})

describe('FormService', () => {
  let formService: FormService
  const mockPrisma = require('@/lib/db').prisma

  beforeEach(() => {
    jest.clearAllMocks()
    formService = new FormService(mockPrisma)
  })

  describe('createForm', () => {
    it('should create a new form successfully', async () => {
      const mockForm = {
        id: 'form-123',
        name: 'Test Form',
        schema: { title: 'Test Form', fields: [] },
        slaDays: 7,
        workflow: {},
        active: true,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.form.create.mockResolvedValue(mockForm)

      const result = await formService.createForm({
        name: 'Test Form',
        schema: { 
          id: 'test',
          title: 'Test Form', 
          fields: [],
          settings: {
            category: 'general',
            slaDays: 7,
            requiresAuth: false,
            allowAnonymous: true
          }
        },
        slaDays: 7,
        createdBy: 'user-123'
      })

      expect(result).toEqual(mockForm)
      expect(mockPrisma.form.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Form',
          schema: expect.any(Object),
          slaDays: 7,
          workflow: {},
          active: true,
          createdBy: 'user-123'
        }
      })
    })
  })

  describe('createSubmission', () => {
    it('should create submission with SLA calculation', async () => {
      const mockForm = {
        id: 'form-123',
        name: 'Test Form',
        schema: {
          title: 'Test Form',
          fields: [{
            id: 'name',
            type: 'text',
            label: 'Name',
            required: true
          }],
          settings: {
            category: 'general',
            slaDays: 7,
            requiresAuth: false,
            allowAnonymous: true
          }
        },
        slaDays: 7,
        active: true
      }

      const mockSubmission = {
        id: 'sub-123',
        formId: 'form-123',
        userId: null,
        data: { name: 'John Doe' },
        files: [],
        status: 'PENDING',
        slaDue: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        history: []
      }

      mockPrisma.form.findUnique.mockResolvedValue(mockForm)
      mockPrisma.submission.create.mockResolvedValue(mockSubmission)

      const result = await formService.createSubmission({
        formId: 'form-123',
        data: { name: 'John Doe' }
      })

      expect(result).toEqual(mockSubmission)
      expect(mockPrisma.submission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          formId: 'form-123',
          data: { name: 'John Doe' },
          slaDue: expect.any(Date),
          history: expect.any(Array)
        })
      })
    })

    it('should validate submission data against form schema', async () => {
      const mockForm = {
        id: 'form-123',
        schema: {
          title: 'Test Form',
          fields: [{
            id: 'email',
            type: 'email',
            label: 'Email',
            required: true
          }],
          settings: {
            category: 'general',
            slaDays: 7,
            requiresAuth: false,
            allowAnonymous: true
          }
        },
        active: true
      }

      mockPrisma.form.findUnique.mockResolvedValue(mockForm)

      await expect(formService.createSubmission({
        formId: 'form-123',
        data: { email: 'invalid-email' } // Invalid email format
      })).rejects.toThrow('Validation failed')
    })
  })

  describe('getSlaStats', () => {
    it('should calculate SLA statistics correctly', async () => {
      mockPrisma.submission.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85)  // resolved
        .mockResolvedValueOnce(12)  // overdue
        .mockResolvedValueOnce(78)  // onTime

      const stats = await formService.getSlaStats()

      expect(stats).toEqual({
        total: 100,
        resolved: 85,
        overdue: 12,
        onTime: 78,
        complianceRate: 88, // (100-12)/100 * 100
        resolutionRate: 85  // 85/100 * 100
      })
    })
  })
})

describe('SlaEngine', () => {
  let slaEngine: SlaEngine
  const mockPrisma = require('@/lib/db').prisma

  beforeEach(() => {
    jest.clearAllMocks()
    slaEngine = new SlaEngine(mockPrisma)
  })

  describe('calculateSlaDue', () => {
    it('should calculate SLA due date correctly for business days', () => {
      const createdAt = new Date('2024-09-02T10:00:00Z') // Monday
      const slaDays = 5
      const config = {
        category: 'complaint',
        slaDays: 5,
        escalationLevels: [],
        businessHours: {
          enabled: true,
          startHour: 9,
          endHour: 17,
          weekdays: [1, 2, 3, 4, 5] // Mon-Fri
        }
      }

      const result = slaEngine.calculateSlaDue(createdAt, slaDays, config)
      
      expect(result.slaDue).toBeDefined()
      expect(result.isOverdue).toBe(false)
      expect(result.severity).toBe('normal')
    })

    it('should identify overdue submissions', () => {
      const createdAt = new Date('2024-08-01T10:00:00Z')
      const slaDays = 7
      
      const result = slaEngine.calculateSlaDue(createdAt, slaDays)
      
      expect(result.isOverdue).toBe(true)
      expect(result.severity).toBe('overdue')
    })
  })

  describe('getDefaultSlaConfig', () => {
    it('should return appropriate config for complaints', () => {
      const config = slaEngine.getDefaultSlaConfig('complaint')
      
      expect(config.category).toBe('complaint')
      expect(config.slaDays).toBe(14)
      expect(config.escalationLevels).toBeDefined()
      expect(config.escalationLevels.length).toBeGreaterThan(0)
    })

    it('should return strict config for RTI requests', () => {
      const config = slaEngine.getDefaultSlaConfig('rti')
      
      expect(config.category).toBe('rti')
      expect(config.slaDays).toBe(30)
      expect(config.businessHours?.enabled).toBe(true)
      
      // RTI should have tighter escalation
      expect(config.escalationLevels[0].hours).toBe(24)
    })
  })

  describe('getSlaMetrics', () => {
    it('should return comprehensive SLA metrics', async () => {
      const mockStats = {
        total: 150,
        resolved: 128,
        overdue: 8,
        onTime: 120,
        complianceRate: 94.67,
        resolutionRate: 85.33
      }

      // Mock the formService.getSlaStats call
      jest.doMock('@/lib/forms/service', () => ({
        formService: {
          getSlaStats: jest.fn().mockResolvedValue(mockStats)
        }
      }))

      mockPrisma.submission.count.mockResolvedValue(12) // escalated
      mockPrisma.submission.findMany.mockResolvedValue([
        { createdAt: new Date('2024-09-01'), resolvedAt: new Date('2024-09-03') },
        { createdAt: new Date('2024-08-28'), resolvedAt: new Date('2024-08-30') }
      ])

      const metrics = await slaEngine.getSlaMetrics()

      expect(metrics).toEqual(expect.objectContaining({
        ...mockStats,
        escalatedCount: 12,
        escalationRate: expect.any(Number),
        avgResolutionHours: expect.any(Number)
      }))
    })
  })
})

describe('Form Builder Integration', () => {
  it('should create form and handle submissions end-to-end', async () => {
    const mockPrisma = require('@/lib/db').prisma
    const formService = new FormService(mockPrisma)

    // Mock form creation
    const mockForm = {
      id: 'integration-form',
      name: 'Integration Test Form',
      schema: getDefaultFormSchema('complaint'),
      slaDays: 14,
      active: true,
      createdBy: 'admin-user'
    }

    mockPrisma.form.create.mockResolvedValue(mockForm)
    mockPrisma.form.findUnique.mockResolvedValue(mockForm)

    // Create form
    const form = await formService.createForm({
      name: 'Integration Test Form',
      schema: getDefaultFormSchema('complaint') as any,
      slaDays: 14,
      createdBy: 'admin-user'
    })

    expect(form).toBeDefined()
    expect(form.id).toBe('integration-form')

    // Mock submission creation
    const mockSubmission = {
      id: 'test-submission',
      formId: form.id,
      data: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
        category: 'water',
        description: 'Test complaint'
      },
      status: 'PENDING',
      slaDue: new Date(),
      createdAt: new Date()
    }

    mockPrisma.submission.create.mockResolvedValue(mockSubmission)

    // Create submission
    const submission = await formService.createSubmission({
      formId: form.id,
      data: mockSubmission.data
    })

    expect(submission).toBeDefined()
    expect(submission.formId).toBe(form.id)
    expect(submission.status).toBe('PENDING')
  })
})
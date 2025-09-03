/**
 * Form submission API tests
 * Part of PR07: Form Builder & SLA Engine
 */

import { POST } from '@/app/api/forms/[id]/submit/route'
import { NextRequest } from 'next/server'
import { formService } from '@/lib/forms/service'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { auditLogger } from '@/lib/auth/audit-logger'

// Mock dependencies
jest.mock('@/lib/forms/service')
jest.mock('@/lib/security/turnstile')
jest.mock('@/lib/auth/audit-logger')

// Mock rate limiting - should always pass in tests
jest.mock('@/lib/security/rate-limit-enhanced', () => ({
  checkRateLimit: jest.fn(() => true), // Always pass rate limit
}))

const mockFormService = formService as jest.Mocked<typeof formService>
const mockVerifyTurnstile = verifyTurnstile as jest.MockedFunction<typeof verifyTurnstile>
const mockAuditLogger = auditLogger as jest.Mocked<typeof auditLogger>

describe('Form Submission API', () => {
  const mockForm = {
    id: 'test-form-id',
    name: 'Test Form',
    active: true,
    schema: {
      id: 'test-form',
      title: 'Test Form',
      fields: [
        {
          id: 'name',
          type: 'text',
          label: 'Name',
          required: true,
        },
      ],
      settings: {
        category: 'test',
        slaDays: 7,
        requiresAuth: false,
        allowAnonymous: true,
      },
    },
  }

  const mockSubmission = {
    id: 'test-submission-id',
    formId: 'test-form-id',
    status: 'PENDING' as const,
    data: { name: 'John Doe' },
    slaDue: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mocks
    mockFormService.getForm.mockResolvedValue(mockForm as any)
    mockFormService.createSubmission.mockResolvedValue(mockSubmission as any)
    mockVerifyTurnstile.mockResolvedValue(true)
    mockAuditLogger.log.mockResolvedValue(undefined)
  })

  describe('POST /api/forms/[id]/submit', () => {
    it('should successfully submit a form with valid data', async () => {
      const request = new NextRequest('http://localhost/api/forms/test-form-id/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.100', // Use Cloudflare header
        },
        body: JSON.stringify({
          data: { name: 'John Doe' },
          turnstileToken: 'valid-token',
        }),
      })

      const response = await POST(request, { params: { id: 'test-form-id' } })
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data.submissionId).toBe('test-submission-id')
      expect(result.data.status).toBe('PENDING')

      expect(mockFormService.getForm).toHaveBeenCalledWith('test-form-id')
      expect(mockVerifyTurnstile).toHaveBeenCalledWith('valid-token', 'unknown')
      expect(mockFormService.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          formId: 'test-form-id',
          data: { name: 'John Doe' },
        })
      )
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'form.submit',
          resource: 'Form',
          resourceId: 'test-form-id',
          actorId: 'anonymous',
        })
      )
    })

    it('should return 404 for non-existent form', async () => {
      mockFormService.getForm.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/forms/non-existent/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { name: 'John Doe' },
          turnstileToken: 'valid-token',
        }),
      })

      const response = await POST(request, { params: { id: 'non-existent' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Form not found or inactive')
    })

    it('should return 404 for inactive form', async () => {
      mockFormService.getForm.mockResolvedValue({
        ...mockForm,
        active: false,
      } as any)

      const request = new NextRequest('http://localhost/api/forms/inactive-form/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { name: 'John Doe' },
          turnstileToken: 'valid-token',
        }),
      })

      const response = await POST(request, { params: { id: 'inactive-form' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Form not found or inactive')
    })

    it('should return 400 for invalid submission data', async () => {
      const request = new NextRequest('http://localhost/api/forms/test-form-id/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required 'data' field
          turnstileToken: 'valid-token',
        }),
      })

      const response = await POST(request, { params: { id: 'test-form-id' } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid submission data')
      expect(result.details).toBeDefined()
    })

    it('should return 403 for failed Turnstile verification', async () => {
      mockVerifyTurnstile.mockRejectedValue(new Error('Turnstile verification failed'))

      const request = new NextRequest('http://localhost/api/forms/test-form-id/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { name: 'John Doe' },
          turnstileToken: 'invalid-token',
        }),
      })

      const response = await POST(request, { params: { id: 'test-form-id' } })
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Security verification failed')
    })

    it('should skip Turnstile verification in development', async () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      })

      const request = new NextRequest('http://localhost/api/forms/test-form-id/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { name: 'John Doe' },
          // No turnstileToken
        }),
      })

      const response = await POST(request, { params: { id: 'test-form-id' } })
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(mockVerifyTurnstile).not.toHaveBeenCalled()

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      })
    })

    it('should require Turnstile token in production', async () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })

      const request = new NextRequest('http://localhost/api/forms/test-form-id/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { name: 'John Doe' },
          // No turnstileToken
        }),
      })

      const response = await POST(request, { params: { id: 'test-form-id' } })
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Security verification is required')

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      })
    })

    it('should handle rate limiting', async () => {
      // Submit multiple requests from the same IP to trigger rate limiting
      const requests = Array.from({ length: 12 }, () =>
        new NextRequest('http://localhost/api/forms/test-form-id/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Real-IP': '192.168.1.100',
          },
          body: JSON.stringify({
            data: { name: 'John Doe' },
            turnstileToken: 'valid-token',
          }),
        })
      )

      const responses = await Promise.all(
        requests.map(request => POST(request, { params: { id: 'test-form-id' } }))
      )

      // First 10 should succeed, rest should be rate limited
      const successCount = (await Promise.all(responses.slice(0, 10).map(r => r.json()))).filter(
        r => r.success
      ).length
      const rateLimitedResponse = await responses[11]?.json()

      expect(successCount).toBeGreaterThan(0)
      if (responses[11]) {
        expect(responses[11]?.status).toBe(429)
        expect(rateLimitedResponse?.error).toBe('Too many requests. Please try again later.')
      }
    })

    it('should handle service errors gracefully', async () => {
      mockFormService.createSubmission.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/forms/test-form-id/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Real-IP': '192.168.2.100', // Use different IP to avoid rate limit
        },
        body: JSON.stringify({
          data: { name: 'John Doe' },
          turnstileToken: 'valid-token',
        }),
      })

      const response = await POST(request, { params: { id: 'test-form-id' } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to submit form. Please try again later.')
      expect(result.submissionId).toBeNull()

      // Should still audit log the error
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'form.submit_error',
        })
      )
    })
  })
})
/**
 * Turnstile utility tests
 * Part of PR07: Form Builder & SLA Engine
 */

import { verifyTurnstile, getClientIP } from '@/lib/security/turnstile'

// Mock fetch for testing
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('Turnstile Security', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'
  })

  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY
  })

  describe('verifyTurnstile', () => {
    it('should verify valid token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await verifyTurnstile('valid-token', '127.0.0.1')
      expect(result).toBe(true)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      )
    })

    it('should reject invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      } as Response)

      await expect(verifyTurnstile('invalid-token')).rejects.toThrow('Turnstile verification failed')
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      await expect(verifyTurnstile('test-token')).rejects.toThrow('Turnstile API error')
    })

    it('should skip verification when secret key is not configured', async () => {
      delete process.env.TURNSTILE_SECRET_KEY
      
      const result = await verifyTurnstile('any-token')
      expect(result).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should reject empty token', async () => {
      await expect(verifyTurnstile('')).rejects.toThrow('Turnstile token is required')
    })
  })

  describe('getClientIP', () => {
    it('should extract IP from CF-Connecting-IP header', () => {
      const request = new Request('http://example.com', {
        headers: {
          'CF-Connecting-IP': '192.168.1.100',
        },
      })

      const ip = getClientIP(request)
      expect(ip).toBe('192.168.1.100')
    })

    it('should extract IP from X-Forwarded-For header', () => {
      const request = new Request('http://example.com', {
        headers: {
          'X-Forwarded-For': '192.168.1.100, 10.0.0.1',
        },
      })

      const ip = getClientIP(request)
      expect(ip).toBe('192.168.1.100')
    })

    it('should return undefined when no IP headers are present', () => {
      const request = new Request('http://example.com')
      
      const ip = getClientIP(request)
      expect(ip).toBeUndefined()
    })

    it('should prioritize CF-Connecting-IP over other headers', () => {
      const request = new Request('http://example.com', {
        headers: {
          'CF-Connecting-IP': '192.168.1.100',
          'X-Forwarded-For': '10.0.0.1',
          'X-Real-IP': '172.16.0.1',
        },
      })

      const ip = getClientIP(request)
      expect(ip).toBe('192.168.1.100')
    })
  })
})
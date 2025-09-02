/**
 * Tests for Turnstile Integration
 * Part of PR07: Form Builder & SLA Engine completion
 */

import { verifyTurnstile, isTurnstileEnabled, getTurnstileSiteKey } from '@/lib/security/turnstile'

// Mock environment variables
const mockEnv = {
  TURNSTILE_SITE_KEY: '0x4AAAAAAABkTiQiHnFX0pyx', // Cloudflare test site key
  TURNSTILE_SECRET_KEY: '0x4AAAAAAABkTiQiHnFX0pyx_test_secret', // Mock secret key
}

describe('Turnstile Security Integration', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.TURNSTILE_SITE_KEY
    delete process.env.TURNSTILE_SECRET_KEY
    
    // Mock fetch for API calls
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('isTurnstileEnabled', () => {
    it('should return false when environment variables are not set', () => {
      expect(isTurnstileEnabled()).toBe(false)
    })

    it('should return true when both site key and secret key are set', () => {
      process.env.TURNSTILE_SITE_KEY = mockEnv.TURNSTILE_SITE_KEY
      process.env.TURNSTILE_SECRET_KEY = mockEnv.TURNSTILE_SECRET_KEY
      
      expect(isTurnstileEnabled()).toBe(true)
    })

    it('should return false when only site key is set', () => {
      process.env.TURNSTILE_SITE_KEY = mockEnv.TURNSTILE_SITE_KEY
      
      expect(isTurnstileEnabled()).toBe(false)
    })
  })

  describe('getTurnstileSiteKey', () => {
    it('should return the site key when configured', () => {
      process.env.TURNSTILE_SITE_KEY = mockEnv.TURNSTILE_SITE_KEY
      
      expect(getTurnstileSiteKey()).toBe(mockEnv.TURNSTILE_SITE_KEY)
    })

    it('should throw error when site key is not configured', () => {
      expect(() => getTurnstileSiteKey()).toThrow('TURNSTILE_SITE_KEY is not configured')
    })
  })

  describe('verifyTurnstile', () => {
    beforeEach(() => {
      process.env.TURNSTILE_SECRET_KEY = mockEnv.TURNSTILE_SECRET_KEY
    })

    it('should successfully verify a valid token', async () => {
      const mockResponse = {
        success: true,
        challenge_ts: '2024-09-02T20:00:00.000Z',
        hostname: 'localhost',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await verifyTurnstile('valid-token')
      
      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.any(URLSearchParams),
        })
      )
    })

    it('should throw error for invalid token', async () => {
      const mockResponse = {
        success: false,
        'error-codes': ['invalid-input-response'],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(verifyTurnstile('invalid-token')).rejects.toThrow(
        'Turnstile verification failed: The response parameter is invalid or malformed'
      )
    })

    it('should throw error when token is empty', async () => {
      await expect(verifyTurnstile('')).rejects.toThrow('Turnstile token is required')
    })

    it('should throw error when secret key is not configured', async () => {
      delete process.env.TURNSTILE_SECRET_KEY
      
      await expect(verifyTurnstile('token')).rejects.toThrow('TURNSTILE_SECRET_KEY is not configured')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(verifyTurnstile('token')).rejects.toThrow('Turnstile API error: 500 Internal Server Error')
    })

    it('should include remote IP when provided', async () => {
      const mockResponse = { success: true }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await verifyTurnstile('token', '192.168.1.1')

      const call = (global.fetch as jest.Mock).mock.calls[0]
      const body = call[1].body as URLSearchParams
      
      expect(body.get('remoteip')).toBe('192.168.1.1')
    })
  })
})
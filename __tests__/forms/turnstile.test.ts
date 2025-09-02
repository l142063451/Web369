/**
 * Turnstile Integration Tests
 * Tests for Cloudflare Turnstile anti-bot protection
 */

import { verifyTurnstile, getTurnstileSiteKey, getCurrentTurnstileConfig } from '@/lib/security/turnstile'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Turnstile Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set test environment variables
    process.env.TURNSTILE_SITE_KEY = 'test-site-key'
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'
  })

  describe('verifyTurnstile', () => {
    it('should verify valid token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await expect(verifyTurnstile('valid-token', '192.168.1.1')).resolves.not.toThrow()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: 'secret=test-secret-key&response=valid-token&remoteip=192.168.1.1',
        }
      )
    })

    it('should throw error for invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: false, 
          'error-codes': ['invalid-input-response']
        }),
      })

      await expect(verifyTurnstile('invalid-token')).rejects.toThrow(
        'Turnstile verification failed: invalid-input-response'
      )
    })

    it('should throw error when TURNSTILE_SECRET_KEY is missing', async () => {
      delete process.env.TURNSTILE_SECRET_KEY

      await expect(verifyTurnstile('token')).rejects.toThrow(
        'TURNSTILE_SECRET_KEY environment variable is required'
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(verifyTurnstile('token')).rejects.toThrow(
        'Turnstile verification failed: Network error'
      )
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(verifyTurnstile('token')).rejects.toThrow(
        'Turnstile verification failed: Turnstile API returned 500'
      )
    })
  })

  describe('getTurnstileSiteKey', () => {
    it('should return site key from environment', () => {
      expect(getTurnstileSiteKey()).toBe('test-site-key')
    })

    it('should throw error when TURNSTILE_SITE_KEY is missing', () => {
      delete process.env.TURNSTILE_SITE_KEY

      expect(() => getTurnstileSiteKey()).toThrow(
        'TURNSTILE_SITE_KEY environment variable is required'
      )
    })
  })

  describe('getCurrentTurnstileConfig', () => {
    it('should return development config in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const config = getCurrentTurnstileConfig()
      
      expect(config.siteKey).toBe('test-site-key')
      expect(config.secretKey).toBe('test-secret-key')

      process.env.NODE_ENV = originalEnv
    })

    it('should return production config in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const config = getCurrentTurnstileConfig()
      
      expect(config.siteKey).toBe('test-site-key')
      expect(config.secretKey).toBe('test-secret-key')

      process.env.NODE_ENV = originalEnv
    })

    it('should fallback to development config for unknown environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      const config = getCurrentTurnstileConfig()
      
      expect(config.siteKey).toBe('test-site-key')

      process.env.NODE_ENV = originalEnv
    })
  })
})
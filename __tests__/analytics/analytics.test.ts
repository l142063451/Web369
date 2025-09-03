/**
 * Analytics Service Tests
 * Part of PR17: Testing & CI Gates - Analytics & Tracking
 */

import { AnalyticsService, AnalyticsEvent, AnalyticsConfig } from '@/lib/analytics'

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((name: string) => {
      const mockHeaders: Record<string, string> = {
        'user-agent': 'Test Browser/1.0',
        'x-forwarded-for': '192.168.1.100',
        'referer': 'https://example.com/page'
      }
      return mockHeaders[name] || null
    })
  }))
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('AnalyticsService', () => {
  let service: AnalyticsService
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    
    // Mock console.log to avoid noise
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default config when no env vars', () => {
      delete process.env.UMAMI_WEBSITE_ID
      delete process.env.UMAMI_HOST
      process.env.NODE_ENV = 'development'
      
      service = new AnalyticsService()
      const config = service.getConfig()
      
      expect(config).toMatchObject({
        websiteId: '',
        host: '',
        enabled: false,
        anonymizeIP: true
      })
    })

    it('should initialize with environment variables', () => {
      process.env.UMAMI_WEBSITE_ID = 'test-website-123'
      process.env.UMAMI_HOST = 'https://analytics.example.com'
      process.env.NODE_ENV = 'production'
      
      service = new AnalyticsService()
      const config = service.getConfig()
      
      expect(config).toMatchObject({
        websiteId: 'test-website-123',
        host: 'https://analytics.example.com',
        enabled: true,
        anonymizeIP: true
      })
    })

    it('should disable analytics in development', () => {
      process.env.UMAMI_WEBSITE_ID = 'test-website-123'
      process.env.UMAMI_HOST = 'https://analytics.example.com'
      process.env.NODE_ENV = 'development'
      
      service = new AnalyticsService()
      const config = service.getConfig()
      
      expect(config.enabled).toBe(false)
    })

    it('should require websiteId for production', () => {
      delete process.env.UMAMI_WEBSITE_ID
      process.env.UMAMI_HOST = 'https://analytics.example.com'
      process.env.NODE_ENV = 'production'
      
      service = new AnalyticsService()
      const config = service.getConfig()
      
      expect(config.enabled).toBe(false)
    })
  })

  describe('trackEvent', () => {
    beforeEach(() => {
      process.env.UMAMI_WEBSITE_ID = 'test-website-123'
      process.env.UMAMI_HOST = 'https://analytics.example.com'
      process.env.NODE_ENV = 'production'
      service = new AnalyticsService()
    })

    it('should track event with minimal data', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const event: AnalyticsEvent = {
        name: 'page_view'
      }

      const result = await service.trackEvent(event)
      
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://analytics.example.com/api/collect',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'Test Browser/1.0'
          }),
          body: expect.stringContaining('"name":"page_view"')
        })
      )
    })

    it('should track event with properties', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const event: AnalyticsEvent = {
        name: 'form_submit',
        properties: {
          form_name: 'contact_form',
          field_count: 5,
          required_fields: 3,
          success: true
        }
      }

      const result = await service.trackEvent(event)
      
      expect(result).toBe(true)
      
      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.name).toBe('form_submit')
      expect(body.properties).toMatchObject({
        form_name: 'contact_form',
        field_count: 5,
        required_fields: 3,
        success: true
      })
    })

    it('should include URL and referrer when provided', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const event: AnalyticsEvent = {
        name: 'button_click',
        url: 'https://example.com/contact',
        referrer: 'https://example.com/home',
        properties: {
          button_text: 'Submit Form',
          location: 'header'
        }
      }

      const result = await service.trackEvent(event)
      
      expect(result).toBe(true)
      
      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.url).toBe('https://example.com/contact')
      expect(body.referrer).toBe('https://example.com/home')
    })

    it('should handle API errors gracefully', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValue(new Error('Network error'))

      const event: AnalyticsEvent = {
        name: 'error_event'
      }

      const result = await service.trackEvent(event)
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        'Analytics tracking failed:',
        expect.any(Error)
      )
    })

    it('should handle HTTP error responses', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response('Server Error', { status: 500 }))

      const event: AnalyticsEvent = {
        name: 'test_event'
      }

      const result = await service.trackEvent(event)
      
      expect(result).toBe(false)
    })

    it('should not track when analytics disabled', async () => {
      process.env.NODE_ENV = 'development'
      service = new AnalyticsService()
      
      const event: AnalyticsEvent = {
        name: 'disabled_event'
      }

      const result = await service.trackEvent(event)
      
      expect(result).toBe(false)
      expect(console.log).toHaveBeenCalledWith(
        'Analytics disabled - would track:',
        event
      )
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('trackPageView', () => {
    beforeEach(() => {
      process.env.UMAMI_WEBSITE_ID = 'test-website-123'
      process.env.UMAMI_HOST = 'https://analytics.example.com'
      process.env.NODE_ENV = 'production'
      service = new AnalyticsService()
    })

    it('should track page view with path', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const result = await service.trackPageView('/contact')
      
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
      
      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.name).toBe('page_view')
      expect(body.url).toContain('/contact')
    })

    it('should track page view with title', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const result = await service.trackPageView('/about', 'About Us')
      
      expect(result).toBe(true)
      
      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.properties?.title).toBe('About Us')
    })
  })

  describe('trackAction', () => {
    beforeEach(() => {
      process.env.UMAMI_WEBSITE_ID = 'test-website-123'
      process.env.UMAMI_HOST = 'https://analytics.example.com'
      process.env.NODE_ENV = 'production'
      service = new AnalyticsService()
    })

    it('should track predefined actions', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))

      const actions = [
        'pledge_created',
        'form_submitted', 
        'project_created',
        'carbon_calculated',
        'solar_calculated',
        'notification_sent'
      ]

      for (const action of actions) {
        await service.trackAction(action, { test: true })
        
        const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
        const body = JSON.parse(callArgs[1]?.body as string)
        
        expect(body.name).toBe(action)
        expect(body.properties?.test).toBe(true)
      }

      expect(mockFetch).toHaveBeenCalledTimes(actions.length)
    })
  })

  describe('getStats', () => {
    beforeEach(() => {
      process.env.UMAMI_WEBSITE_ID = 'test-website-123'
      process.env.UMAMI_HOST = 'https://analytics.example.com'
      process.env.NODE_ENV = 'production'
      service = new AnalyticsService()
    })

    it('should fetch analytics statistics', async () => {
      const mockStats = {
        pageviews: 1250,
        visitors: 980,
        bounceRate: 0.35,
        averageTime: 145,
        topPages: [
          { path: '/', views: 450 },
          { path: '/services', views: 320 },
          { path: '/contact', views: 180 }
        ]
      }

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockStats), { status: 200 }))

      const stats = await service.getStats()
      
      expect(stats).toEqual(mockStats)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/websites/test-website-123/stats'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      )
    })

    it('should handle stats API errors', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValue(new Error('API Error'))

      const stats = await service.getStats()
      
      expect(stats).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch analytics stats:',
        expect.any(Error)
      )
    })
  })

  describe('getConfig', () => {
    it('should return current configuration', () => {
      process.env.UMAMI_WEBSITE_ID = 'config-test-123'
      process.env.UMAMI_HOST = 'https://config.example.com'
      process.env.NODE_ENV = 'production'
      
      service = new AnalyticsService()
      const config = service.getConfig()
      
      expect(config).toMatchObject({
        websiteId: 'config-test-123',
        host: 'https://config.example.com',
        enabled: true,
        anonymizeIP: true
      })
    })
  })

  describe('updateConfig', () => {
    beforeEach(() => {
      service = new AnalyticsService()
    })

    it('should update configuration', () => {
      const newConfig: Partial<AnalyticsConfig> = {
        websiteId: 'new-website-456',
        host: 'https://new-analytics.example.com',
        enabled: true
      }

      service.updateConfig(newConfig)
      const config = service.getConfig()
      
      expect(config.websiteId).toBe('new-website-456')
      expect(config.host).toBe('https://new-analytics.example.com')
      expect(config.enabled).toBe(true)
      expect(config.anonymizeIP).toBe(true) // Should retain existing value
    })
  })

  describe('validation', () => {
    it('should validate event names', () => {
      const validNames = [
        'page_view',
        'form_submit',
        'button_click',
        'pledge_created',
        'carbon_calculated'
      ]

      validNames.forEach(name => {
        expect(service.isValidEventName(name)).toBe(true)
      })
    })

    it('should reject invalid event names', () => {
      const invalidNames = [
        '',
        'invalid-name',
        'name with spaces',
        'name.with.dots',
        'NAME_IN_CAPS'
      ]

      invalidNames.forEach(name => {
        expect(service.isValidEventName(name)).toBe(false)
      })
    })

    it('should validate event properties', () => {
      const validProperties = {
        string_prop: 'value',
        number_prop: 42,
        boolean_prop: true,
        zero_value: 0,
        empty_string: ''
      }

      expect(service.validateEventProperties(validProperties)).toBe(true)
    })

    it('should reject invalid event properties', () => {
      const invalidProperties = {
        object_prop: { nested: 'object' },
        array_prop: [1, 2, 3],
        function_prop: () => 'test',
        null_prop: null,
        undefined_prop: undefined
      }

      expect(service.validateEventProperties(invalidProperties)).toBe(false)
    })
  })
})
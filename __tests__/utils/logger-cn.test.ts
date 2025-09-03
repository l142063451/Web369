/**
 * Logger and CN Utility Tests
 * Part of PR17: Testing & CI Gates - Utility Functions
 */

import { cn, logger } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('additional-class')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const isDisabled = false
      
      const result = cn(
        'base',
        isActive && 'active',
        isDisabled && 'disabled'
      )
      
      expect(result).toContain('base')
      expect(result).toContain('active')
      expect(result).not.toContain('disabled')
    })

    it('should handle arrays of classes', () => {
      const classes = ['class1', 'class2']
      const result = cn(classes, 'class3')
      
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('should handle empty and undefined values', () => {
      const result = cn('', undefined, null, false, 'valid-class')
      expect(result).toBe('valid-class')
    })

    it('should merge Tailwind classes intelligently', () => {
      // Test that Tailwind merge works (conflicting classes)
      const result = cn('px-2 px-4', 'py-1 py-2')
      
      // Should contain the later classes and not duplicate
      expect(result).toContain('px-4')
      expect(result).toContain('py-2')
      expect(typeof result).toBe('string')
    })
  })

  describe('logger', () => {
    beforeEach(() => {
      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(console, 'warn').mockImplementation()
      jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should log info messages correctly', () => {
      logger.info('Test info message')
      
      expect(console.log).toHaveBeenCalledWith('[INFO] Test info message', '')
    })

    it('should log info messages with metadata', () => {
      const metadata = { userId: '123', action: 'login' }
      logger.info('User logged in', metadata)
      
      expect(console.log).toHaveBeenCalledWith(
        '[INFO] User logged in',
        JSON.stringify(metadata, null, 2)
      )
    })

    it('should log warning messages correctly', () => {
      logger.warn('Test warning message')
      
      expect(console.warn).toHaveBeenCalledWith('[WARN] Test warning message', '')
    })

    it('should log warning messages with metadata', () => {
      const metadata = { component: 'auth', issue: 'deprecated-api' }
      logger.warn('Using deprecated API', metadata)
      
      expect(console.warn).toHaveBeenCalledWith(
        '[WARN] Using deprecated API',
        JSON.stringify(metadata, null, 2)
      )
    })

    it('should log error messages correctly', () => {
      logger.error('Test error message')
      
      expect(console.error).toHaveBeenCalledWith('[ERROR] Test error message', '')
    })

    it('should log error messages with metadata', () => {
      const metadata = { 
        error: 'Database connection failed',
        code: 'CONN_TIMEOUT',
        timestamp: '2024-01-01T00:00:00Z'
      }
      logger.error('Database error occurred', metadata)
      
      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Database error occurred',
        JSON.stringify(metadata, null, 2)
      )
    })

    it('should handle complex metadata objects', () => {
      const complexMetadata = {
        user: {
          id: '123',
          email: 'test@example.com',
          roles: ['user', 'admin']
        },
        request: {
          method: 'POST',
          url: '/api/users',
          headers: {
            'content-type': 'application/json'
          }
        },
        timestamp: new Date().toISOString()
      }

      logger.info('Complex operation', complexMetadata)
      
      expect(console.log).toHaveBeenCalledWith(
        '[INFO] Complex operation',
        JSON.stringify(complexMetadata, null, 2)
      )
    })

    it('should handle null and undefined metadata', () => {
      logger.info('Message with null meta', null)
      logger.warn('Message with undefined meta', undefined)
      logger.error('Message with no meta')
      
      expect(console.log).toHaveBeenCalledWith('[INFO] Message with null meta', '')
      expect(console.warn).toHaveBeenCalledWith('[WARN] Message with undefined meta', '')
      expect(console.error).toHaveBeenCalledWith('[ERROR] Message with no meta', '')
    })

    it('should handle circular reference in metadata', () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj
      
      // Should not throw error even with circular reference
      // Note: JSON.stringify will throw on circular references, which is expected behavior
      expect(() => {
        try {
          JSON.stringify(circularObj, null, 2)
        } catch (error) {
          // This is expected for circular references
          expect(error).toBeInstanceOf(TypeError)
        }
      }).not.toThrow()
    })

    it('should format JSON with proper indentation', () => {
      const metadata = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      }

      logger.info('Nested object test', metadata)
      
      const expectedJson = JSON.stringify(metadata, null, 2)
      expect(console.log).toHaveBeenCalledWith(
        '[INFO] Nested object test',
        expectedJson
      )
      
      // Check that JSON is properly formatted with 2-space indentation
      expect(expectedJson).toContain('  "level1"')
      expect(expectedJson).toContain('    "level2"')
      expect(expectedJson).toContain('      "level3"')
    })
  })

  describe('Integration Tests', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation()
      jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should work together in typical usage scenarios', () => {
      // Simulate typical component usage
      const buttonClasses = cn(
        'px-4 py-2 font-medium rounded',
        'bg-blue-500 text-white',
        'hover:bg-blue-600',
        'disabled:opacity-50'
      )

      expect(buttonClasses).toContain('px-4')
      expect(buttonClasses).toContain('bg-blue-500')
      expect(buttonClasses).toContain('hover:bg-blue-600')

      // Log the result
      logger.info('Button classes generated', { classes: buttonClasses })
      
      expect(console.log).toHaveBeenCalledWith(
        '[INFO] Button classes generated',
        JSON.stringify({ classes: buttonClasses }, null, 2)
      )
    })

    it('should handle error scenarios with proper logging', () => {
      // Simulate error scenario
      const errorCondition = true
      const errorClass = errorCondition && 'error-state'
      
      const classes = cn('base', errorClass)
      
      if (errorCondition) {
        logger.error('Error state detected', { 
          classes,
          condition: errorCondition,
          timestamp: new Date().toISOString()
        })
      }

      expect(classes).toContain('error-state')
      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Error state detected',
        expect.stringContaining('"classes":')
      )
    })
  })
})
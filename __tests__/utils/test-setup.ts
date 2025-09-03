/**
 * Centralized test setup utilities for PR17
 * Provides consistent mocking patterns across all test files
 */

// Mock Prisma Client with comprehensive methods
export const createMockPrisma = () => ({
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  $query: jest.fn(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  
  // Common model methods
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  
  page: {
    create: jest.fn(),
    findUnique: jest.fn(), 
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  form: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  submission: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  news: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  event: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  eventRSVP: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  notice: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  
  media: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  auditLog: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  translationKey: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  
  translationValue: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
})

// Standard audit logger mock
export const createAuditLoggerMock = () => ({
  createAuditLog: jest.fn(),
  auditCreate: jest.fn(),
  auditUpdate: jest.fn(),
  auditDelete: jest.fn(),
})

// Standard DOMPurify mock
export const createDOMPurifyMock = () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html: string) => html),
  },
})

// AWS S3 mocks
export const createS3Mocks = () => ({
  s3Client: {
    send: jest.fn(),
  },
  getSignedUrl: jest.fn(),
})

// Common mock setup helper
export const setupCommonMocks = () => {
  const mockPrisma = createMockPrisma()
  const mockAuditLogger = createAuditLoggerMock()
  const mockDOMPurify = createDOMPurifyMock()
  const mockS3 = createS3Mocks()
  
  return {
    mockPrisma,
    mockAuditLogger, 
    mockDOMPurify,
    mockS3
  }
}

// Helper to create Next.js Request mock that's compatible with NextRequest
export const createNextRequestMock = (url: string, options: any = {}) => {
  const headers = new Map()
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key.toLowerCase(), value as string)
    })
  }
  
  return {
    url,
    method: options.method || 'GET',
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()),
      has: (name: string) => headers.has(name.toLowerCase()),
      entries: () => headers.entries(),
      keys: () => headers.keys(),
      values: () => headers.values(),
    },
    body: options.body,
    json: jest.fn().mockResolvedValue(options.body || {}),
    text: jest.fn().mockResolvedValue(options.body || ''),
    formData: jest.fn(),
    clone: jest.fn(),
  }
}

// Helper to mock dates for consistent testing
export const mockCurrentDate = (date: string | Date) => {
  const mockDate = typeof date === 'string' ? new Date(date) : date
  const originalDate = global.Date
  const originalDateNow = Date.now
  
  global.Date = jest.fn(() => mockDate) as any
  global.Date.now = jest.fn(() => mockDate.getTime())
  Object.setPrototypeOf(global.Date, originalDate)
  
  return () => {
    global.Date = originalDate
    Date.now = originalDateNow
  }
}

// Helper to create future date for testing
export const createFutureDate = (daysFromNow: number = 7) => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date
}

// Helper to create past date for testing
export const createPastDate = (daysAgo: number = 7) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date
}

// Tests for utility functions
describe('Test Setup Utilities', () => {
  describe('createFutureDate', () => {
    it('should create a date in the future', () => {
      const futureDate = createFutureDate(7)
      const now = new Date()
      expect(futureDate.getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('createPastDate', () => {
    it('should create a date in the past', () => {
      const pastDate = createPastDate(7)
      const now = new Date()
      expect(pastDate.getTime()).toBeLessThan(now.getTime())
    })
  })

  describe('createMockPrisma', () => {
    it('should create a comprehensive Prisma mock', () => {
      const mockPrisma = createMockPrisma()
      expect(mockPrisma.user.create).toBeDefined()
      expect(mockPrisma.$connect).toBeDefined()
    })
  })
})
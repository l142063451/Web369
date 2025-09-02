/**
 * @jest-environment jsdom
 */

import { 
  queueFormSubmission, 
  getQueuedSubmissions, 
  removeQueuedSubmission, 
  clearQueuedSubmissions 
} from '@/lib/pwa/background-sync'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => store[key] = value,
    removeItem: (key: string) => delete store[key],
    clear: () => store = {}
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
})

describe('Background Sync', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should queue form submissions', () => {
    const testData = { name: 'Test', email: 'test@example.com' }
    
    queueFormSubmission('/api/test', testData)
    
    const queued = getQueuedSubmissions()
    expect(queued).toHaveLength(1)
    expect(queued[0].url).toBe('/api/test')
    expect(queued[0].data).toEqual(testData)
  })

  it('should retrieve queued submissions', () => {
    const testData = { name: 'Test' }
    queueFormSubmission('/api/test', testData)
    
    const queued = getQueuedSubmissions()
    expect(queued).toHaveLength(1)
    expect(queued[0].id).toBe('test-uuid-123')
  })

  it('should remove queued submissions', () => {
    queueFormSubmission('/api/test', { name: 'Test' })
    
    let queued = getQueuedSubmissions()
    expect(queued).toHaveLength(1)
    
    removeQueuedSubmission('test-uuid-123')
    
    queued = getQueuedSubmissions()
    expect(queued).toHaveLength(0)
  })

  it('should clear all queued submissions', () => {
    queueFormSubmission('/api/test1', { name: 'Test1' })
    queueFormSubmission('/api/test2', { name: 'Test2' })
    
    let queued = getQueuedSubmissions()
    expect(queued).toHaveLength(2)
    
    clearQueuedSubmissions()
    
    queued = getQueuedSubmissions()
    expect(queued).toHaveLength(0)
  })

  it('should handle FormData conversion', () => {
    const formData = new FormData()
    formData.append('name', 'Test User')
    formData.append('email', 'test@example.com')
    
    queueFormSubmission('/api/test', formData)
    
    const queued = getQueuedSubmissions()
    expect(queued[0].data).toEqual({
      name: 'Test User',
      email: 'test@example.com'
    })
  })
})
/**
 * Background sync utilities for offline form submissions
 * Part of PR03 - PWA & Service Worker implementation
 */

interface QueuedFormData {
  id: string
  url: string
  data: FormData | Record<string, unknown>
  timestamp: number
  retryCount: number
}

const QUEUE_STORAGE_KEY = 'pwa_form_queue'

/**
 * Queue form data for background sync when offline
 */
export function queueFormSubmission(
  url: string, 
  data: FormData | Record<string, unknown>
): void {
  if (typeof window === 'undefined') return

  const queuedItem: QueuedFormData = {
    id: crypto.randomUUID(),
    url,
    data: data instanceof FormData ? formDataToObject(data) : data,
    timestamp: Date.now(),
    retryCount: 0
  }

  const queue = getQueuedSubmissions()
  queue.push(queuedItem)
  
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))

  // Try to sync if online
  if (navigator.onLine) {
    syncQueuedSubmissions()
  }

  console.log(`Form submission queued: ${url}`)
}

/**
 * Get all queued form submissions
 */
export function getQueuedSubmissions(): QueuedFormData[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to get queued submissions:', error)
    return []
  }
}

/**
 * Remove a form submission from the queue
 */
export function removeQueuedSubmission(id: string): void {
  if (typeof window === 'undefined') return

  const queue = getQueuedSubmissions()
  const filtered = queue.filter(item => item.id !== id)
  
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * Sync all queued form submissions
 */
export async function syncQueuedSubmissions(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return

  const queue = getQueuedSubmissions()
  if (queue.length === 0) return

  console.log(`Syncing ${queue.length} queued form submissions`)

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.data)
      })

      if (response.ok) {
        removeQueuedSubmission(item.id)
        console.log(`Successfully synced form submission: ${item.url}`)
      } else {
        // Increment retry count and keep in queue
        item.retryCount++
        
        // Remove if too many retries (after 7 days or 10 attempts)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
        if (item.retryCount >= 10 || item.timestamp < sevenDaysAgo) {
          removeQueuedSubmission(item.id)
          console.warn(`Removed failed form submission after max retries: ${item.url}`)
        } else {
          // Update the queue with incremented retry count
          const queue = getQueuedSubmissions()
          const index = queue.findIndex(q => q.id === item.id)
          if (index >= 0) {
            queue[index] = item
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
          }
        }
      }
    } catch (error) {
      console.error(`Failed to sync form submission ${item.url}:`, error)
      
      // Increment retry count
      item.retryCount++
      const queue = getQueuedSubmissions()
      const index = queue.findIndex(q => q.id === item.id)
      if (index >= 0) {
        queue[index] = item
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
      }
    }
  }
}

/**
 * Clear all queued submissions (for development/testing)
 */
export function clearQueuedSubmissions(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(QUEUE_STORAGE_KEY)
}

/**
 * Get count of queued submissions
 */
export function getQueuedSubmissionCount(): number {
  return getQueuedSubmissions().length
}

/**
 * Setup online/offline event listeners for automatic sync
 */
export function setupBackgroundSync(): void {
  if (typeof window === 'undefined') return

  // Sync when coming back online
  window.addEventListener('online', () => {
    console.log('Back online, syncing queued submissions')
    syncQueuedSubmissions()
  })

  // Log when going offline
  window.addEventListener('offline', () => {
    console.log('Gone offline, form submissions will be queued')
  })

  // Periodic sync for missed online events
  setInterval(() => {
    if (navigator.onLine && getQueuedSubmissionCount() > 0) {
      syncQueuedSubmissions()
    }
  }, 60000) // Every minute
}

/**
 * Convert FormData to plain object for JSON serialization
 */
function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  
  for (const [key, value] of formData.entries()) {
    if (obj[key]) {
      // Handle multiple values for same key (convert to array)
      if (Array.isArray(obj[key])) {
        (obj[key] as unknown[]).push(value)
      } else {
        obj[key] = [obj[key], value]
      }
    } else {
      obj[key] = value
    }
  }
  
  return obj
}
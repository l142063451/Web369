'use client'

import { useState, useEffect } from 'react'
import { getQueuedSubmissionCount, setupBackgroundSync } from '@/lib/pwa/background-sync'

export function PWAStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [queuedCount, setQueuedCount] = useState(0)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Setup background sync
    setupBackgroundSync()

    // Check online status
    setIsOnline(navigator.onLine)

    // Check if PWA is installed
    const checkInstalled = () => {
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)
    }
    checkInstalled()

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check queued submissions periodically
    const checkQueue = () => {
      setQueuedCount(getQueuedSubmissionCount())
    }

    checkQueue()
    const interval = setInterval(checkQueue, 5000) // Check every 5 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  // Don't render anything if everything is normal
  if (isOnline && queuedCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border rounded-lg shadow-lg p-3 max-w-sm">
        <div className="flex items-center space-x-2">
          {/* Status indicator */}
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          
          <div className="text-sm">
            {!isOnline && (
              <div className="text-red-600 font-medium">
                You&rsquo;re offline
              </div>
            )}
            
            {queuedCount > 0 && (
              <div className="text-blue-600">
                {queuedCount} form{queuedCount !== 1 ? 's' : ''} queued
                {isOnline && ' (syncing...)'}
              </div>
            )}
          </div>
        </div>

        {!isOnline && (
          <p className="text-xs text-gray-500 mt-1">
            You can still browse and fill forms. They&rsquo;ll sync when you&rsquo;re back online.
          </p>
        )}
      </div>
    </div>
  )
}
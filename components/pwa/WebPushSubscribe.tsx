'use client'

import { useState, useEffect } from 'react'
import { 
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribedToPush, 
  requestNotificationPermission 
} from '@/lib/notifications/webpush-client'

export function WebPushSubscribe() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check initial permission and subscription status
    const checkStatus = async () => {
      if ('Notification' in window) {
        setPermission(Notification.permission)
        const subscribed = await isSubscribedToPush()
        setIsSubscribed(subscribed)
      }
    }
    
    checkStatus()
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    
    try {
      // First request permission if not granted
      if (permission !== 'granted') {
        const newPermission = await requestNotificationPermission()
        setPermission(newPermission)
        
        if (newPermission !== 'granted') {
          alert('Notifications permission is required for alerts')
          return
        }
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPush()
      
      if (subscription) {
        // Send subscription to server
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription)
        })
        
        if (response.ok) {
          setIsSubscribed(true)
          console.log('Successfully subscribed to notifications')
        } else {
          console.error('Failed to save subscription on server')
        }
      }
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    
    try {
      const success = await unsubscribeFromPush()
      
      if (success) {
        // Remove subscription from server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST'
        })
        
        setIsSubscribed(false)
        console.log('Successfully unsubscribed from notifications')
      }
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if notifications aren't supported
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg 
            className="w-6 h-6 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 17h5l-5 5-5-5h5zm0 0V3" 
            />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            Stay Updated
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Get notifications about important updates, complaint status changes, and community events.
          </p>
          
          <div className="mt-3">
            {permission === 'denied' ? (
              <p className="text-sm text-red-600">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            ) : isSubscribed ? (
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Turn Off Notifications'}
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Enable Notifications'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
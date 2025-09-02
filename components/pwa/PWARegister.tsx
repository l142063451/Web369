'use client'

import { useEffect } from 'react'
import { Workbox } from 'workbox-window'

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const wb = new Workbox('/sw.js', { scope: '/' })
      
      wb.addEventListener('controlling', () => {
        window.location.reload()
      })

      wb.addEventListener('waiting', (event) => {
        // Show notification to user about update
        if (confirm('A new version is available. Would you like to update?')) {
          wb.addEventListener('controlling', () => {
            window.location.reload()
          })
          
          // Tell the waiting service worker to skip waiting
          wb.messageSkipWaiting()
        }
      })

      wb.addEventListener('installed', (event) => {
        if (!event.isUpdate) {
          // Show notification about PWA being installed
          console.log('PWA installed successfully')
        }
      })

      wb.register().catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
    }
  }, [])

  return null
}
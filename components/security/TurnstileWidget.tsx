/**
 * Turnstile Widget Component
 * Client-side Cloudflare Turnstile integration for forms
 * Part of PR07: Form Builder & SLA Engine
 */

'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      ready: (callback: () => void) => void
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact'
          retry?: 'auto' | 'never'
          'retry-interval'?: number
          'refresh-expired'?: 'auto' | 'manual' | 'never'
          language?: string
          appearance?: 'always' | 'execute' | 'interaction-only'
          'response-field'?: boolean
          'response-field-name'?: string
        }
      ) => string | null
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
      getResponse: (widgetId: string) => string
    }
  }
}

interface TurnstileWidgetProps {
  siteKey: string
  onSuccess: (token: string) => void
  onError?: () => void
  onExpired?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  className?: string
  id?: string
}

export function TurnstileWidget({
  siteKey,
  onSuccess,
  onError,
  onExpired,
  theme = 'auto',
  size = 'normal',
  className = '',
  id = 'turnstile-widget',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if script already exists
        if (document.querySelector('script[src*="challenges.cloudflare.com"]')) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Turnstile script'))
        
        document.head.appendChild(script)
      })
    }

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return

      // Remove existing widget if any
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (error) {
          console.warn('Failed to remove existing Turnstile widget:', error)
        }
      }

      // Render new widget
      try {
        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onSuccess,
          'error-callback': onError,
          'expired-callback': onExpired,
          theme,
          size,
          retry: 'auto',
          'refresh-expired': 'auto',
        })

        if (widgetId) {
          widgetIdRef.current = widgetId
        }
      } catch (error) {
        console.error('Failed to render Turnstile widget:', error)
        onError?.()
      }
    }

    const initialize = async () => {
      try {
        await loadScript()
        
        if (window.turnstile && window.turnstile.ready) {
          window.turnstile.ready(() => {
            renderWidget()
          })
        } else {
          renderWidget()
        }
      } catch (error) {
        console.error('Failed to initialize Turnstile:', error)
        onError?.()
      }
    }

    initialize()

    // Cleanup function
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (error) {
          console.warn('Failed to cleanup Turnstile widget:', error)
        }
      }
    }
  }, [siteKey, onSuccess, onError, onExpired, theme, size])

  return (
    <div
      ref={containerRef}
      id={id}
      className={`turnstile-widget ${className}`}
      style={{ minHeight: size === 'compact' ? '65px' : '80px' }}
    />
  )
}

/**
 * Hook for managing Turnstile token state
 */
export function useTurnstile() {
  const tokenRef = useRef<string | null>(null)

  const setToken = (token: string) => {
    tokenRef.current = token
  }

  const clearToken = () => {
    tokenRef.current = null
  }

  const getToken = () => {
    return tokenRef.current
  }

  return {
    setToken,
    clearToken,
    getToken,
  }
}
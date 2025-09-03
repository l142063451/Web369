/**
 * Turnstile Widget Component
 * Client-side Turnstile integration
 * Part of PR07: Form Builder & SLA Engine
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { turnstileConfig } from '@/lib/security/turnstile'

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: TurnstileOptions) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string
    }
  }
}

interface TurnstileOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  action?: string
  cdata?: string
}

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  action?: string
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  theme = turnstileConfig.theme,
  size = turnstileConfig.size,
  action = turnstileConfig.action,
}: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Turnstile script
  useEffect(() => {
    if (isLoaded || !turnstileConfig.siteKey) {
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      setIsLoaded(true)
    }
    
    script.onerror = () => {
      setError('Failed to load Turnstile script')
    }

    document.head.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [isLoaded])

  // Render Turnstile widget
  useEffect(() => {
    if (!isLoaded || !ref.current || widgetId || !window.turnstile || !turnstileConfig.siteKey) {
      return
    }

    try {
      const id = window.turnstile.render(ref.current, {
        sitekey: turnstileConfig.siteKey,
        theme,
        size,
        action,
        cdata: turnstileConfig.cData,
        callback: (token: string) => {
          onVerify?.(token)
        },
        'error-callback': () => {
          setError('Turnstile verification failed')
          onError?.()
        },
        'expired-callback': () => {
          onExpire?.()
        },
      })
      
      setWidgetId(id)
    } catch (err) {
      setError('Failed to render Turnstile widget')
      console.error('Turnstile render error:', err)
    }
  }, [isLoaded, theme, size, action, onVerify, onError, onExpire, widgetId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch (err) {
          console.warn('Failed to cleanup Turnstile widget:', err)
        }
      }
    }
  }, [widgetId])

  // Reset method
  const reset = () => {
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.reset(widgetId)
      } catch (err) {
        console.warn('Failed to reset Turnstile widget:', err)
      }
    }
  }

  // Don't render if no site key is configured
  if (!turnstileConfig.siteKey) {
    return (
      <div className="text-sm text-gray-500">
        Turnstile not configured (development mode)
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
        Security verification failed: {error}
        <button
          type="button"
          onClick={() => {
            setError(null)
            setWidgetId(null)
            setIsLoaded(false)
          }}
          className="ml-2 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="turnstile-widget">
      <div ref={ref} />
      {!isLoaded && (
        <div className="text-sm text-gray-500 animate-pulse">
          Loading security verification...
        </div>
      )}
    </div>
  )
}

// Hook to imperatively control Turnstile
export function useTurnstile() {
  const reset = (widgetId: string) => {
    if (window.turnstile) {
      window.turnstile.reset(widgetId)
    }
  }

  const getResponse = (widgetId: string) => {
    if (window.turnstile) {
      return window.turnstile.getResponse(widgetId)
    }
    return ''
  }

  return { reset, getResponse }
}
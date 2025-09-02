/**
 * Cloudflare Turnstile React Component
 * Client-side widget for bot protection in forms
 * Part of PR07: Form Builder & SLA Engine completion
 */

'use client'

import { useEffect, useRef, useState } from 'react'

export interface TurnstileProps {
  siteKey: string
  onSuccess?: (token: string) => void
  onError?: (error: string) => void
  onExpired?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'invisible'
  tabindex?: number
  callback?: string
  'expired-callback'?: string
  'error-callback'?: string
  'before-interactive-callback'?: string
  'after-interactive-callback'?: string
  'unsupported-callback'?: string
  'timeout-callback'?: string
  className?: string
  id?: string
}

declare global {
  interface Window {
    turnstile: {
      render(element: string | HTMLElement, options: any): string
      reset(widgetId: string): void
      getResponse(widgetId: string): string
      remove(widgetId: string): void
      ready(callback: () => void): void
    }
  }
}

/**
 * Turnstile React Component
 */
export function Turnstile({
  siteKey,
  onSuccess,
  onError,
  onExpired,
  theme = 'light',
  size = 'normal',
  tabindex,
  className,
  id,
  ...props
}: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Turnstile script
  useEffect(() => {
    const loadScript = () => {
      if (document.querySelector('script[src*="challenges.cloudflare.com"]')) {
        setIsLoaded(true)
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
        onError?.('Failed to load Turnstile script')
      }

      document.head.appendChild(script)
    }

    loadScript()
  }, [onError])

  // Initialize Turnstile widget
  useEffect(() => {
    if (!isLoaded || !ref.current || !window.turnstile) {
      return
    }

    const renderWidget = () => {
      try {
        if (widgetId) {
          window.turnstile.remove(widgetId)
        }

        const newWidgetId = window.turnstile.render(ref.current!, {
          sitekey: siteKey,
          theme,
          size,
          ...(tabindex !== undefined && { tabindex }),
          callback: (token: string) => {
            onSuccess?.(token)
          },
          'error-callback': (error: string) => {
            setError(error)
            onError?.(error)
          },
          'expired-callback': () => {
            onExpired?.()
          },
          ...props,
        })

        setWidgetId(newWidgetId)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Turnstile'
        setError(errorMessage)
        onError?.(errorMessage)
      }
    }

    if (window.turnstile.ready) {
      window.turnstile.ready(renderWidget)
    } else {
      renderWidget()
    }

    // Cleanup function
    return () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch (err) {
          console.warn('Failed to remove Turnstile widget:', err)
        }
      }
    }
  }, [isLoaded, siteKey, theme, size, tabindex, onSuccess, onError, onExpired, props])

  /**
   * Reset the widget
   */
  const reset = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId)
      setError(null)
    }
  }

  /**
   * Get the current response token
   */
  const getResponse = (): string => {
    if (widgetId && window.turnstile) {
      return window.turnstile.getResponse(widgetId)
    }
    return ''
  }

  // Expose methods via ref
  useEffect(() => {
    if (ref.current) {
      ;(ref.current as any).reset = reset
      ;(ref.current as any).getResponse = getResponse
    }
  }, [widgetId])

  if (error) {
    return (
      <div className={`turnstile-error ${className || ''}`}>
        <div className="text-red-600 text-sm">
          Failed to load security verification. Please refresh the page.
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={`turnstile-loading ${className || ''}`}>
        <div className="animate-pulse bg-gray-200 h-16 w-64 rounded"></div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      data-testid="turnstile-widget"
    />
  )
}

/**
 * Hook for using Turnstile in forms
 */
export function useTurnstile() {
  const [token, setToken] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)

  const handleSuccess = (token: string) => {
    setToken(token)
    setIsVerified(true)
    setError(null)
  }

  const handleError = (error: string) => {
    setError(error)
    setToken('')
    setIsVerified(false)
  }

  const handleExpired = () => {
    setToken('')
    setIsVerified(false)
    setError('Verification expired. Please try again.')
  }

  const reset = () => {
    if (widgetRef.current && (widgetRef.current as any).reset) {
      ;(widgetRef.current as any).reset()
    }
    setToken('')
    setIsVerified(false)
    setError(null)
  }

  const getResponse = (): string => {
    if (widgetRef.current && (widgetRef.current as any).getResponse) {
      return (widgetRef.current as any).getResponse()
    }
    return token
  }

  return {
    token,
    error,
    isVerified,
    widgetRef,
    handleSuccess,
    handleError,
    handleExpired,
    reset,
    getResponse,
  }
}

export default Turnstile
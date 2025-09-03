/**
 * Cloudflare Turnstile Integration
 * Anti-bot protection for form submissions
 * Part of PR07: Form Builder & SLA Engine
 */

export interface TurnstileResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

/**
 * Verify Turnstile token on server side
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  
  if (!secretKey) {
    console.warn('TURNSTILE_SECRET_KEY not configured, skipping verification')
    return true // Allow in development if not configured
  }

  if (!token) {
    throw new Error('Turnstile token is required')
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (ip) {
      formData.append('remoteip', ip)
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Turnstile API error: ${response.status}`)
    }

    const data: TurnstileResponse = await response.json()
    
    if (!data.success) {
      const errorCodes = data['error-codes'] || ['unknown-error']
      console.warn('Turnstile verification failed:', errorCodes)
      throw new Error(`Turnstile verification failed: ${errorCodes.join(', ')}`)
    }

    return true
  } catch (error) {
    console.error('Turnstile verification error:', error)
    
    // Re-throw specific errors from verification or API calls
    if (error instanceof Error) {
      // If it's already a Turnstile verification or API error, keep it
      if (error.message.includes('Turnstile verification failed') || 
          error.message.includes('Turnstile API error') ||
          error.message.includes('Turnstile token is required')) {
        throw error
      }
    }
    
    // For other errors, throw generic message
    throw new Error('Anti-bot verification failed')
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string | undefined {
  // Check various headers for real IP
  const headers = [
    'CF-Connecting-IP', // Cloudflare
    'X-Real-IP', // Nginx
    'X-Forwarded-For', // Load balancers
    'X-Client-IP', // Apache
  ]

  for (const header of headers) {
    const ip = request.headers.get(header)
    if (ip) {
      // X-Forwarded-For can contain multiple IPs, get the first one
      return ip.split(',')[0]?.trim()
    }
  }

  return undefined
}

/**
 * Turnstile configuration for client-side
 */
export const turnstileConfig = {
  siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
  theme: 'light' as const,
  size: 'normal' as const,
  action: 'form-submit',
  cData: 'form-protection',
}
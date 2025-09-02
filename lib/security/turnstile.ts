/**
 * Cloudflare Turnstile Integration
 * Anti-bot protection for form submissions
 * Part of PR07: Form Builder & SLA Engine completion
 */

import { z } from 'zod'

export interface TurnstileVerificationRequest {
  token: string
  remoteip?: string
}

export interface TurnstileVerificationResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

const TurnstileResponseSchema = z.object({
  success: z.boolean(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
  action: z.string().optional(),
  cdata: z.string().optional(),
})

/**
 * Verify Turnstile token with Cloudflare
 */
export async function verifyTurnstile(
  token: string, 
  remoteip?: string
): Promise<TurnstileVerificationResponse> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  
  if (!secretKey) {
    throw new Error('TURNSTILE_SECRET_KEY is not configured')
  }

  if (!token || token.length === 0) {
    throw new Error('Turnstile token is required')
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (remoteip) {
      formData.append('remoteip', remoteip)
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Turnstile API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const validation = TurnstileResponseSchema.safeParse(data)
    
    if (!validation.success) {
      console.error('Invalid Turnstile API response:', data)
      throw new Error('Invalid response from Turnstile API')
    }

    const result = validation.data

    if (!result.success) {
      const errors = result['error-codes'] || ['unknown-error']
      const errorMessage = getTurnstileErrorMessage(errors[0])
      throw new Error(`Turnstile verification failed: ${errorMessage}`)
    }

    return result

  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to verify Turnstile token')
  }
}

/**
 * Get human-readable error message for Turnstile error codes
 */
function getTurnstileErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'missing-input-secret': 'The secret parameter is missing',
    'invalid-input-secret': 'The secret parameter is invalid or malformed',
    'missing-input-response': 'The response parameter is missing',
    'invalid-input-response': 'The response parameter is invalid or malformed',
    'bad-request': 'The request is invalid or malformed',
    'timeout-or-duplicate': 'The response is no longer valid: either is too old or has been used previously',
    'internal-error': 'An internal error happened while validating the response',
    'invalid-widget-id': 'The widget ID extracted from the parsed site secret key was invalid',
    'invalid-parsed-secret': 'The secret extracted from the parsed site secret key was invalid',
  }

  return errorMessages[errorCode] || `Unknown error: ${errorCode}`
}

/**
 * Middleware to verify Turnstile token from request
 */
export async function verifyTurnstileFromRequest(
  request: Request
): Promise<TurnstileVerificationResponse> {
  // Get client IP from various possible headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const remoteip = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : undefined)

  // Extract Turnstile token from request
  let token: string
  
  const contentType = request.headers.get('content-type') || ''
  
  if (contentType.includes('application/json')) {
    const body = await request.clone().json()
    token = body.turnstileToken || body['cf-turnstile-response']
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.clone().formData()
    token = formData.get('turnstileToken') as string || formData.get('cf-turnstile-response') as string
  } else {
    throw new Error('Unsupported content type for Turnstile verification')
  }

  if (!token) {
    throw new Error('Turnstile token not found in request')
  }

  return await verifyTurnstile(token, remoteip)
}

/**
 * Check if Turnstile is enabled in environment
 */
export function isTurnstileEnabled(): boolean {
  return !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)
}

/**
 * Get Turnstile site key for client-side widget
 */
export function getTurnstileSiteKey(): string {
  const siteKey = process.env.TURNSTILE_SITE_KEY
  
  if (!siteKey) {
    throw new Error('TURNSTILE_SITE_KEY is not configured')
  }
  
  return siteKey
}

/**
 * Validate that Turnstile environment variables are properly configured
 */
export function validateTurnstileConfig(): void {
  const siteKey = process.env.TURNSTILE_SITE_KEY
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  
  if (!siteKey || !secretKey) {
    throw new Error('Turnstile is not properly configured. Please set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY environment variables')
  }

  // Basic validation of key formats
  if (!siteKey.startsWith('0x') || siteKey.length !== 66) {
    console.warn('TURNSTILE_SITE_KEY appears to have invalid format')
  }
  
  if (!secretKey.startsWith('0x') || secretKey.length !== 66) {
    console.warn('TURNSTILE_SECRET_KEY appears to have invalid format')
  }
}
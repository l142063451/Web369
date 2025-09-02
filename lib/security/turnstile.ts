/**
 * Cloudflare Turnstile Integration
 * Anti-bot protection for forms as specified in INSTRUCTIONS_FOR_COPILOT.md
 * Part of PR07: Form Builder & SLA Engine
 */

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
}

/**
 * Verify Turnstile token on server side
 * Implementation exactly as specified in INSTRUCTIONS_FOR_COPILOT.md §26.2
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    throw new Error('TURNSTILE_SECRET_KEY environment variable is required')
  }

  try {
    const formData = new URLSearchParams({
      secret,
      response: token,
      remoteip: ip ?? '',
    })

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Turnstile API returned ${response.status}`)
    }

    const data: TurnstileResponse = await response.json()

    if (!data.success) {
      const errorCodes = data['error-codes']?.join(', ') ?? 'Unknown error'
      throw new Error(`Turnstile verification failed: ${errorCodes}`)
    }

    // Verification successful
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Turnstile verification failed: ${error.message}`)
    }
    throw new Error('Turnstile verification failed: Unknown error')
  }
}

/**
 * Get Turnstile site key for client-side widget
 */
export function getTurnstileSiteKey(): string {
  const siteKey = process.env.TURNSTILE_SITE_KEY
  if (!siteKey) {
    throw new Error('TURNSTILE_SITE_KEY environment variable is required')
  }
  return siteKey
}

/**
 * Turnstile configuration for different environments
 */
export const turnstileConfig = {
  development: {
    // Use test keys in development
    siteKey: process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA', // Test site key
    secretKey: process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA', // Test secret key
  },
  production: {
    siteKey: process.env.TURNSTILE_SITE_KEY!,
    secretKey: process.env.TURNSTILE_SECRET_KEY!,
  },
}

/**
 * Get configuration for current environment
 */
export function getCurrentTurnstileConfig() {
  const env = process.env.NODE_ENV as 'development' | 'production'
  return turnstileConfig[env] || turnstileConfig.development
}
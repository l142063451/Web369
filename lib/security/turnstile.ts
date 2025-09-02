/**
 * Cloudflare Turnstile Verification
 * Based on INSTRUCTIONS_FOR_COPILOT.md §26.2
 */

export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    console.warn('TURNSTILE_SECRET_KEY not configured, skipping verification')
    return true // Allow in development
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 
        secret: process.env.TURNSTILE_SECRET_KEY, 
        response: token, 
        remoteip: ip ?? '' 
      })
    })
    
    const data = await res.json()
    
    if (!data.success) {
      console.error('Turnstile verification failed:', data['error-codes'])
      return false
    }
    
    return true
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return false
  }
}
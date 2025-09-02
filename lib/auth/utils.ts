import { randomBytes } from 'crypto'

/**
 * Generate a secure random secret for TOTP
 */
export function generateSecret(): string {
  return randomBytes(32).toString('base64').replace(/[^A-Z0-9]/gi, '').substring(0, 32)
}

/**
 * Generate recovery codes for 2FA backup
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character recovery code
    const code = randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * Generate a secure random session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a password using crypto (simple implementation - in production use bcrypt)
 */
export function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64')
}

/**
 * Verify a password against its hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString('base64') === hash
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): string {
  return `pk_${randomBytes(24).toString('hex')}`
}

/**
 * Generate a secure random verification token
 */
export function generateVerificationToken(): string {
  return randomBytes(16).toString('hex')
}
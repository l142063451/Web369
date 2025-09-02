import { authenticator } from 'otplib'
import { generateSecret, generateRecoveryCodes } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'
import QRCode from 'qrcode'

export interface TwoFASetupData {
  secret: string
  qrCodeUrl: string
  qrCodeDataUrl: string
  recoveryCodes: string[]
}

/**
 * Generate TOTP setup data for a user
 */
export async function generateTotpSetup(userId: string): Promise<TwoFASetupData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const secret = generateSecret()
  const serviceName = process.env.APP_NAME || 'Ummid Se Hari'
  const accountName = user.email || 'Unknown User'
  
  const qrCodeUrl = authenticator.keyuri(accountName, serviceName, secret)
  const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl)
  const recoveryCodes = generateRecoveryCodes()

  return {
    secret,
    qrCodeUrl,
    qrCodeDataUrl,
    recoveryCodes,
  }
}

/**
 * Verify TOTP token
 */
export function verifyTotpToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch (error) {
    console.error('TOTP verification error:', error)
    return false
  }
}

/**
 * Enable 2FA for a user
 */
export async function enableTwoFA(
  userId: string, 
  secret: string, 
  token: string, 
  recoveryCodes: string[]
): Promise<boolean> {
  // Verify the token first
  if (!verifyTotpToken(secret, token)) {
    return false
  }

  try {
    // Hash recovery codes before storing
    const hashedRecoveryCodes = recoveryCodes.map(code => 
      // Simple hash - in production you might want bcrypt
      Buffer.from(code).toString('base64')
    )

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: true,
        twoFASecret: secret,
        recoveryCodes: hashedRecoveryCodes,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'ENABLE_2FA',
        resource: 'user',
        resourceId: userId,
        diff: { twoFAEnabled: true },
      },
    })

    return true
  } catch (error) {
    console.error('Failed to enable 2FA:', error)
    return false
  }
}

/**
 * Disable 2FA for a user
 */
export async function disableTwoFA(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFASecret: true, twoFAEnabled: true }
  })

  if (!user?.twoFAEnabled || !user.twoFASecret) {
    return false
  }

  // Verify current token before disabling
  if (!verifyTotpToken(user.twoFASecret, token)) {
    return false
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: false,
        twoFASecret: null,
        recoveryCodes: [],
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'DISABLE_2FA',
        resource: 'user',
        resourceId: userId,
        diff: { twoFAEnabled: false },
      },
    })

    return true
  } catch (error) {
    console.error('Failed to disable 2FA:', error)
    return false
  }
}

/**
 * Verify 2FA token for a user
 */
export async function verifyUserTwoFA(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFASecret: true, twoFAEnabled: true, recoveryCodes: true }
  })

  if (!user?.twoFAEnabled || !user.twoFASecret) {
    return false
  }

  // Try TOTP first
  if (verifyTotpToken(user.twoFASecret, token)) {
    return true
  }

  // Try recovery codes
  const hashedToken = Buffer.from(token).toString('base64')
  if (user.recoveryCodes.includes(hashedToken)) {
    // Remove used recovery code
    const updatedCodes = user.recoveryCodes.filter((code: string) => code !== hashedToken)
    
    await prisma.user.update({
      where: { id: userId },
      data: { recoveryCodes: updatedCodes }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USE_RECOVERY_CODE',
        resource: 'user',
        resourceId: userId,
        diff: { recoveryCodeUsed: true },
      },
    })

    return true
  }

  return false
}

/**
 * Check if user requires 2FA verification
 */
export async function requiresTwoFA(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      twoFAEnabled: true,
      roles: {
        include: {
          role: {
            select: { name: true }
          }
        }
      }
    }
  })

  if (!user) return false

  // If user has 2FA enabled, always require it
  if (user.twoFAEnabled) return true

  // Check if user has admin role and 2FA enforcement is enabled
  const hasAdminRole = user.roles.some((userRole: any) =>
    ['admin', 'editor'].includes(userRole.role.name.toLowerCase())
  )

  // Get 2FA enforcement setting
  const enforcementSetting = await prisma.setting.findUnique({
    where: { key: 'enforce_2fa_for_admins' }
  })

  const enforce2FA = enforcementSetting?.value as boolean ?? true

  return hasAdminRole && enforce2FA
}
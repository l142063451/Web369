/**
 * Advanced audience targeting system for notifications
 * Supports role-based, geographic, and custom criteria filtering
 */

import { NotificationAudience, AudienceError } from './types'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/utils'

export interface AudienceUser {
  id: string
  name?: string
  email?: string
  phone?: string
  locale: string
  roles: string[]
  ward?: string
  interests?: string[]
  preferences?: {
    emailNotifications: boolean
    smsNotifications: boolean
    whatsappNotifications: boolean
    webPushNotifications: boolean
  }
}

export class AudienceService {
  /**
   * Get users based on audience criteria
   */
  static async getUsersByAudience(audience: NotificationAudience): Promise<AudienceUser[]> {
    try {
      switch (audience.type) {
        case 'ALL':
          return await this.getAllUsers(audience.criteria)
        
        case 'ROLE':
          return await this.getUsersByRole(audience.criteria)
        
        case 'CUSTOM':
          return await this.getUsersByCustomCriteria(audience.criteria)
        
        default:
          throw new AudienceError('Unknown audience type', audience)
      }
    } catch (error) {
      logger.error('Failed to get users by audience', { audience, error })
      throw new AudienceError(
        `Failed to resolve audience: ${error instanceof Error ? error.message : 'Unknown error'}`,
        audience
      )
    }
  }

  /**
   * Estimate audience size without fetching actual users
   */
  static async estimateAudienceSize(audience: NotificationAudience): Promise<number> {
    try {
      const whereClause = this.buildWhereClause(audience)
      return await prisma.user.count({ where: whereClause })
    } catch (error) {
      logger.error('Failed to estimate audience size', { audience, error })
      return 0
    }
  }

  /**
   * Validate audience criteria
   */
  static validateAudience(audience: NotificationAudience): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!audience.type || !['ALL', 'ROLE', 'CUSTOM'].includes(audience.type)) {
      errors.push('Invalid audience type. Must be ALL, ROLE, or CUSTOM')
    }

    if (!audience.criteria || typeof audience.criteria !== 'object') {
      errors.push('Audience criteria is required')
    }

    if (audience.type === 'ROLE') {
      if (!audience.criteria.roles || !Array.isArray(audience.criteria.roles) || audience.criteria.roles.length === 0) {
        errors.push('Role-based audience must specify at least one role')
      }
    }

    if (audience.criteria.userIds && !Array.isArray(audience.criteria.userIds)) {
      errors.push('User IDs must be an array')
    }

    if (audience.criteria.wards && !Array.isArray(audience.criteria.wards)) {
      errors.push('Wards must be an array')
    }

    if (audience.criteria.locale && !Array.isArray(audience.criteria.locale)) {
      errors.push('Locale must be an array')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Get audience preview (first 10 users matching criteria)
   */
  static async getAudiencePreview(audience: NotificationAudience): Promise<AudienceUser[]> {
    try {
      const whereClause = this.buildWhereClause(audience)
      
      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          locale: true,
          roles: {
            include: {
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        take: 10
      })

      return users.map((user: any) => ({
        id: user.id,
        name: user.name || undefined,
        email: user.email || undefined,
        phone: user.phone || undefined,
        locale: user.locale,
        roles: user.roles.map((ur: any) => ur.role.name),
        // Mock preferences for now
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          whatsappNotifications: true,
          webPushNotifications: true
        }
      }))
    } catch (error) {
      logger.error('Failed to get audience preview', { audience, error })
      return []
    }
  }

  /**
   * Get user segments for audience builder UI
   */
  static async getUserSegments() {
    try {
      const [roles, wards, locales] = await Promise.all([
        prisma.role.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        // Mock wards data - in production this could come from a Ward model or Settings
        Promise.resolve([
          { id: 'ward-1', name: 'Ward 1' },
          { id: 'ward-2', name: 'Ward 2' },
          { id: 'ward-3', name: 'Ward 3' },
          { id: 'ward-4', name: 'Ward 4' }
        ]),
        // Get available locales
        prisma.user.findMany({
          select: { locale: true },
          distinct: ['locale']
        })
      ])

      const interests = [
        'Environment', 'Health', 'Education', 'Infrastructure', 
        'Agriculture', 'Employment', 'Social Welfare', 'Technology'
      ]

      return {
        roles: roles.map((r: any) => ({ value: r.name, label: r.name })),
        wards: wards.map(w => ({ value: w.id, label: w.name })),
        locales: locales.map((l: any) => ({ value: l.locale, label: l.locale === 'en' ? 'English' : 'Hindi' })),
        interests: interests.map(i => ({ value: i.toLowerCase(), label: i }))
      }
    } catch (error) {
      logger.error('Failed to get user segments', error)
      return {
        roles: [],
        wards: [],
        locales: [
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'Hindi' }
        ],
        interests: []
      }
    }
  }

  /**
   * Private helper methods
   */
  private static async getAllUsers(criteria: NotificationAudience['criteria']): Promise<AudienceUser[]> {
    const whereClause = this.buildWhereClause({ type: 'ALL', criteria })
    
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        locale: true,
        roles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return this.mapUsersToAudienceUsers(users)
  }

  private static async getUsersByRole(criteria: NotificationAudience['criteria']): Promise<AudienceUser[]> {
    if (!criteria.roles || criteria.roles.length === 0) {
      throw new AudienceError('Role criteria requires at least one role', { type: 'ROLE', criteria })
    }

    const whereClause = this.buildWhereClause({ type: 'ROLE', criteria })
    
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        locale: true,
        roles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return this.mapUsersToAudienceUsers(users)
  }

  private static async getUsersByCustomCriteria(criteria: NotificationAudience['criteria']): Promise<AudienceUser[]> {
    const whereClause = this.buildWhereClause({ type: 'CUSTOM', criteria })
    
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        locale: true,
        roles: {
          include: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return this.mapUsersToAudienceUsers(users)
  }

  private static buildWhereClause(audience: NotificationAudience) {
    const where: any = {}

    // Filter by specific user IDs
    if (audience.criteria.userIds && audience.criteria.userIds.length > 0) {
      where.id = { in: audience.criteria.userIds }
    }

    // Filter by roles
    if (audience.criteria.roles && audience.criteria.roles.length > 0) {
      where.roles = {
        some: {
          role: {
            name: { in: audience.criteria.roles }
          }
        }
      }
    }

    // Filter by email availability
    if (audience.criteria.hasEmail === true) {
      where.email = { not: null }
    } else if (audience.criteria.hasEmail === false) {
      where.email = null
    }

    // Filter by phone availability
    if (audience.criteria.hasPhone === true) {
      where.phone = { not: null }
    } else if (audience.criteria.hasPhone === false) {
      where.phone = null
    }

    // Filter by locale
    if (audience.criteria.locale && audience.criteria.locale.length > 0) {
      where.locale = { in: audience.criteria.locale }
    }

    // Note: Ward and interests filtering would require additional fields in the User model
    // For now, these are placeholders for future implementation

    return where
  }

  private static mapUsersToAudienceUsers(users: any[]): AudienceUser[] {
    return users.map(user => ({
      id: user.id,
      name: user.name || undefined,
      email: user.email || undefined,
      phone: user.phone || undefined,
      locale: user.locale,
      roles: user.roles.map((ur: any) => ur.role.name),
      // Mock data for now - these would come from user preferences in production
      preferences: {
        emailNotifications: true,
        smsNotifications: !!user.phone,
        whatsappNotifications: !!user.phone,
        webPushNotifications: true
      }
    }))
  }
}

/**
 * Convenience function for getting users by audience
 */
export async function getUsersByAudience(audience: NotificationAudience): Promise<AudienceUser[]> {
  return AudienceService.getUsersByAudience(audience)
}

/**
 * Convenience function for estimating audience size
 */
export async function estimateAudienceSize(audience: NotificationAudience): Promise<number> {
  return AudienceService.estimateAudienceSize(audience)
}

/**
 * Convenience function for validating audience
 */
export function validateAudience(audience: NotificationAudience) {
  return AudienceService.validateAudience(audience)
}
import { PrismaClient } from '@prisma/client'
import { evaluateEligibility, type EligibilityResult } from './jsonLogic'

const prisma = new PrismaClient()

export interface SchemeInput {
  title: string
  category: string
  criteria?: unknown
  docsRequired: string[]
  processSteps: string[]
  links: string[]
  active?: boolean
}

export interface EligibilityRunInput {
  schemeId: string
  userId?: string
  answers: Record<string, unknown>
}

export class SchemesService {
  /**
   * Get all active schemes with optional filtering
   */
  static async getSchemes({
    category,
    active = true,
    search
  }: {
    category?: string
    active?: boolean
    search?: string
  } = {}) {
    const where: any = { active }

    if (category) {
      where.category = category
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive'
      }
    }

    return prisma.scheme.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { title: 'asc' }
      ]
    })
  }

  /**
   * Get a single scheme by ID
   */
  static async getScheme(id: string) {
    return prisma.scheme.findUnique({
      where: { id },
      include: {
        eligibilityRuns: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  /**
   * Create a new scheme (Admin only)
   */
  static async createScheme(data: SchemeInput) {
    return prisma.scheme.create({
      data: {
        title: data.title,
        category: data.category,
        criteria: data.criteria || {},
        docsRequired: data.docsRequired,
        processSteps: data.processSteps,
        links: data.links,
        active: data.active ?? true
      }
    })
  }

  /**
   * Update an existing scheme (Admin only)
   */
  static async updateScheme(id: string, data: Partial<SchemeInput>) {
    return prisma.scheme.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.category && { category: data.category }),
        ...(data.criteria !== undefined && { criteria: data.criteria }),
        ...(data.docsRequired && { docsRequired: data.docsRequired }),
        ...(data.processSteps && { processSteps: data.processSteps }),
        ...(data.links && { links: data.links }),
        ...(data.active !== undefined && { active: data.active })
      }
    })
  }

  /**
   * Delete a scheme (Admin only)
   */
  static async deleteScheme(id: string) {
    return prisma.scheme.delete({
      where: { id }
    })
  }

  /**
   * Check eligibility for a scheme
   */
  static async checkEligibility({
    schemeId,
    userId,
    answers
  }: EligibilityRunInput): Promise<EligibilityResult> {
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId, active: true }
    })

    if (!scheme) {
      throw new Error('Scheme not found or inactive')
    }

    // Evaluate eligibility using JSON-Logic
    const result = evaluateEligibility(scheme.criteria, answers)

    // Save the eligibility run for tracking
    await prisma.eligibilityRun.create({
      data: {
        schemeId,
        userId,
        answers,
        result: {
          eligible: result.eligible,
          explanation: result.details.explanation,
          nextSteps: result.details.nextSteps
        }
      }
    })

    return result
  }

  /**
   * Get eligibility history for a user
   */
  static async getUserEligibilityHistory(userId: string) {
    return prisma.eligibilityRun.findMany({
      where: { userId },
      include: {
        scheme: {
          select: {
            id: true,
            title: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get scheme categories for filtering
   */
  static async getCategories() {
    const result = await prisma.scheme.groupBy({
      by: ['category'],
      where: { active: true },
      _count: {
        id: true
      },
      orderBy: {
        category: 'asc'
      }
    })

    return result.map((item: any) => ({
      category: item.category,
      count: item._count.id
    }))
  }

  /**
   * Get scheme statistics for admin dashboard
   */
  static async getSchemeStats() {
    const [total, active, byCategory, recentRuns] = await Promise.all([
      prisma.scheme.count(),
      prisma.scheme.count({ where: { active: true } }),
      prisma.scheme.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { category: 'asc' }
      }),
      prisma.eligibilityRun.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ])

    return {
      total,
      active,
      inactive: total - active,
      byCategory,
      eligibilityRunsLast30Days: recentRuns
    }
  }
}
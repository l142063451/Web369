/**
 * Directory Service Layer for PR13 - Directory & Economy
 * Implements SHGs, businesses, jobs, training with maps & filters, moderation, and enquiry flows
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import DOMPurify from 'isomorphic-dompurify'
import { createAuditLog } from '@/lib/audit/logger'

// Type definitions
export type DirectoryEntryType = 'SHG' | 'BUSINESS' | 'JOB' | 'TRAINING'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface DirectoryEntry {
  id: string
  type: DirectoryEntryType
  name: string
  contact: {
    email?: string
    phone?: string
    address?: string
    website?: string
  }
  description?: string
  products: {
    items?: string[]
    services?: string[]
    skills?: string[]
    categories?: string[]
  }
  geo?: {
    latitude?: number
    longitude?: number
    address?: string
  }
  approved: boolean
  userId?: string
  createdAt: Date
  updatedAt: Date
}

// Enhanced interface with computed fields
export interface DirectoryEntryWithDetails extends DirectoryEntry {
  enquiryCount?: number
  isOwner?: boolean
  canModerate?: boolean
}

// Validation schemas
const ContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  address: z.string().max(500).optional(),
  website: z.string().url().optional()
}).refine(data => data.email || data.phone, {
  message: 'At least email or phone is required'
})

const ProductsSchema = z.object({
  items: z.array(z.string().min(1).max(100)).max(20).optional(),
  services: z.array(z.string().min(1).max(100)).max(20).optional(),
  skills: z.array(z.string().min(1).max(100)).max(20).optional(),
  categories: z.array(z.string().min(1).max(50)).max(10).optional()
})

const GeoSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(200).optional()
}).optional()

export const CreateDirectoryEntrySchema = z.object({
  type: z.enum(['SHG', 'BUSINESS', 'JOB', 'TRAINING']),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  contact: ContactSchema,
  description: z.string().max(2000, 'Description too long').optional(),
  products: ProductsSchema.default({}),
  geo: GeoSchema
})

export const UpdateDirectoryEntrySchema = CreateDirectoryEntrySchema.partial().extend({
  id: z.string().cuid()
})

export const DirectoryFiltersSchema = z.object({
  type: z.enum(['SHG', 'BUSINESS', 'JOB', 'TRAINING']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  approved: z.boolean().optional(),
  hasGeo: z.boolean().optional(),
  userId: z.string().optional(),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number()
  }).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(12)
})

// Enquiry schema
export const EnquirySchema = z.object({
  entryId: z.string().cuid(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10).max(15).optional(),
  message: z.string().min(1, 'Message is required').max(1000),
  type: z.enum(['GENERAL', 'COLLABORATION', 'PURCHASE', 'JOB_APPLICATION', 'TRAINING_INQUIRY']).default('GENERAL')
})

export class DirectoryService {
  /**
   * Create a new directory entry
   */
  static async create(data: z.infer<typeof CreateDirectoryEntrySchema>, userId: string): Promise<DirectoryEntry> {
    const validatedData = CreateDirectoryEntrySchema.parse(data)
    
    // Sanitize description
    const sanitizedDescription = validatedData.description 
      ? DOMPurify.sanitize(validatedData.description)
      : undefined

    const entry = await prisma.directoryEntry.create({
      data: {
        ...validatedData,
        description: sanitizedDescription,
        userId,
        approved: false // Entries require approval
      }
    })

    await createAuditLog({
      action: 'CREATE',
      resource: 'DirectoryEntry', 
      resourceId: entry.id,
      actorId: userId,
      metadata: { type: entry.type }
    })

    return entry as DirectoryEntry
  }

  /**
   * Update directory entry
   */
  static async update(data: z.infer<typeof UpdateDirectoryEntrySchema>, userId: string): Promise<DirectoryEntry> {
    const validatedData = UpdateDirectoryEntrySchema.parse(data)
    const { id, ...updateData } = validatedData

    // Verify ownership or admin permissions
    const existing = await prisma.directoryEntry.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!existing) {
      throw new Error('Directory entry not found')
    }

    if (existing.userId !== userId) {
      // TODO: Check admin permissions
      throw new Error('Not authorized to update this entry')
    }

    // Sanitize description if provided
    if (updateData.description) {
      updateData.description = DOMPurify.sanitize(updateData.description)
    }

    const entry = await prisma.directoryEntry.update({
      where: { id },
      data: {
        ...updateData,
        // Reset approval if content changed
        approved: false
      }
    })

    await createAuditLog({
      action: 'UPDATE',
      resource: 'DirectoryEntry',
      resourceId: entry.id,
      actorId: userId,
      metadata: { type: entry.type }
    })

    return entry as DirectoryEntry
  }

  /**
   * Get directory entry by ID
   */
  static async getById(id: string, userId?: string): Promise<DirectoryEntryWithDetails | null> {
    const entry = await prisma.directoryEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    if (!entry) return null

    return {
      ...entry,
      isOwner: entry.userId === userId,
      canModerate: false // TODO: Check admin permissions
    } as DirectoryEntryWithDetails
  }

  /**
   * List directory entries with filters
   */
  static async list(filters: Partial<z.infer<typeof DirectoryFiltersSchema>> = {}) {
    const validatedFilters = DirectoryFiltersSchema.parse(filters)
    const { page, limit, type, category, search, approved, hasGeo, userId, bounds } = validatedFilters

    const skip = (page - 1) * limit

    // Build where conditions
    const where: any = {}

    if (type) {
      where.type = type
    }

    if (approved !== undefined) {
      where.approved = approved
    }

    if (userId) {
      where.userId = userId
    }

    if (hasGeo) {
      where.geo = { not: null }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [entries, totalCount] = await Promise.all([
      prisma.directoryEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { approved: 'desc' }, // Approved entries first
          { createdAt: 'desc' }
        ],
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.directoryEntry.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      entries: entries as DirectoryEntry[],
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  /**
   * Get approved entries by type
   */
  static async getByType(type: DirectoryEntryType, limit: number = 20) {
    const entries = await prisma.directoryEntry.findMany({
      where: {
        type,
        approved: true
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    return entries as DirectoryEntry[]
  }

  /**
   * Get statistics
   */
  static async getStats() {
    const [
      totalEntries,
      approvedEntries,
      pendingEntries,
      shgCount,
      businessCount,
      jobCount,
      trainingCount
    ] = await Promise.all([
      prisma.directoryEntry.count(),
      prisma.directoryEntry.count({ where: { approved: true } }),
      prisma.directoryEntry.count({ where: { approved: false } }),
      prisma.directoryEntry.count({ where: { type: 'SHG', approved: true } }),
      prisma.directoryEntry.count({ where: { type: 'BUSINESS', approved: true } }),
      prisma.directoryEntry.count({ where: { type: 'JOB', approved: true } }),
      prisma.directoryEntry.count({ where: { type: 'TRAINING', approved: true } })
    ])

    return {
      totalEntries,
      approvedEntries,
      pendingEntries,
      byType: {
        SHG: shgCount,
        BUSINESS: businessCount,
        JOB: jobCount,
        TRAINING: trainingCount
      },
      approvalRate: totalEntries > 0 ? (approvedEntries / totalEntries) * 100 : 0
    }
  }

  /**
   * Get all categories across entries
   */
  static async getCategories(): Promise<{ category: string; count: number }[]> {
    const entries = await prisma.directoryEntry.findMany({
      where: { approved: true },
      select: { products: true }
    })

    const categoryMap = new Map<string, number>()
    
    entries.forEach((entry: { products: any }) => {
      const products = entry.products as any
      if (products?.categories) {
        products.categories.forEach((category: string) => {
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
        })
      }
    })

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Delete directory entry
   */
  static async delete(id: string, userId: string): Promise<void> {
    // Verify ownership or admin permissions
    const existing = await prisma.directoryEntry.findUnique({
      where: { id },
      select: { userId: true, name: true }
    })

    if (!existing) {
      throw new Error('Directory entry not found')
    }

    if (existing.userId !== userId) {
      // TODO: Check admin permissions
      throw new Error('Not authorized to delete this entry')
    }

    await prisma.directoryEntry.delete({
      where: { id }
    })

    await createAuditLog({
      action: 'DELETE',
      resource: 'DirectoryEntry',
      resourceId: id,
      actorId: userId,
      metadata: { name: existing.name }
    })
  }
}
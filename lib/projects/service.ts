/**
 * Projects Service
 * Handles project CRUD operations, budget tracking, and milestone management
 * for PR09 - Projects & Budgets with Maps
 */

import { z } from 'zod'
import { prisma, canUsePrisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit/logger'
// Types - mock types since Prisma client may not be generated
export type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Project {
  id: string
  title: string
  type: string
  ward: string | null
  budget: number
  spent: number
  status: ProjectStatus
  startDate: Date | null
  endDate: Date | null
  milestones: any[]
  geo: any | null
  contractors: any
  docs: string[]
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  date: Date
  progress: number
  notes: string | null
  photos: string[]
  geo: any | null
  latitude: number | null
  longitude: number | null
  createdAt: Date
  updatedAt: Date
}

export interface BudgetLine {
  id: string
  projectId: string
  category: string
  subcategory: string | null
  allocated: number
  spent: number
  committed: number
  description: string | null
  createdAt: Date
  updatedAt: Date
}

// Validation schemas
export const projectCreateSchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  type: z.string().min(1, 'Project type is required'),
  ward: z.string().optional(),
  budget: z.number().positive('Budget must be positive'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  geo: z.any().optional(), // GeoJSON
  contractors: z.record(z.unknown()).default({}),
  docs: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
})

export const budgetLineCreateSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  allocated: z.number().positive('Allocated amount must be positive'),
  description: z.string().optional(),
})

export const milestoneCreateSchema = z.object({
  title: z.string().min(1, 'Milestone title is required'),
  date: z.date(),
  notes: z.string().optional(),
  photos: z.array(z.string()).default([]),
  geo: z.any().optional(), // GeoJSON
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export const projectUpdateSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  ward: z.string().optional(),
  budget: z.number().positive().optional(),
  spent: z.number().min(0).optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  geo: z.any().optional(),
  contractors: z.record(z.unknown()).optional(),
  docs: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

// Types
export type ProjectWithMilestones = Project & {
  projectMilestones: Milestone[]
  budgetLines: BudgetLine[]
}

export type BudgetSummary = {
  totalAllocated: number
  totalSpent: number
  totalCommitted: number
  remaining: number
  categories: Record<string, {
    allocated: number
    spent: number
    committed: number
  }>
}

// Mock data for development when Prisma is not available
const mockProjects: ProjectWithMilestones[] = [
  {
    id: 'mock-project-1',
    title: 'Village Road Improvement',
    type: 'Infrastructure',
    ward: 'Ward 1',
    budget: 500000,
    spent: 250000,
    status: 'IN_PROGRESS',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    milestones: [],
    geo: {
      type: 'Point',
      coordinates: [79.6413, 29.5537]
    },
    contractors: { primary: 'Local Construction Co.' },
    docs: [],
    tags: ['infrastructure', 'road'],
    createdAt: new Date(),
    updatedAt: new Date(),
    projectMilestones: [],
    budgetLines: []
  }
]

/**
 * Project Service Class
 */
export class ProjectService {
  /**
   * Create a new project
   */
  static async createProject(
    data: z.infer<typeof projectCreateSchema>,
    userId: string
  ): Promise<Project> {
    const validatedData = projectCreateSchema.parse(data)

    if (!canUsePrisma()) {
      // Mock implementation for development
      const mockProject: Project = {
        id: `mock-${Date.now()}`,
        title: validatedData.title,
        type: validatedData.type,
        ward: validatedData.ward || null,
        budget: validatedData.budget,
        spent: 0,
        status: 'PLANNED',
        startDate: validatedData.startDate || null,
        endDate: validatedData.endDate || null,
        milestones: [],
        geo: validatedData.geo || null,
        contractors: validatedData.contractors,
        docs: validatedData.docs,
        tags: validatedData.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      console.log('Mock project created:', mockProject.id)
      return mockProject
    }

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        budget: validatedData.budget,
      },
    })

    await createAuditLog({
      actorId: userId,
      action: 'CREATE',
      resource: 'Project',
      resourceId: project.id,
      metadata: { title: project.title, type: project.type },
    })

    return project
  }

  /**
   * Get project by ID with related data
   */
  static async getProject(id: string): Promise<ProjectWithMilestones | null> {
    if (!canUsePrisma()) {
      return mockProjects.find(p => p.id === id) || null
    }

    return await prisma.project.findUnique({
      where: { id },
      include: {
        projectMilestones: {
          orderBy: { date: 'asc' }
        },
        budgetLines: {
          orderBy: { category: 'asc' }
        }
      },
    })
  }

  /**
   * List projects with filtering
   */
  static async listProjects(filters: {
    status?: ProjectStatus
    ward?: string
    type?: string
    limit?: number
    offset?: number
  } = {}): Promise<ProjectWithMilestones[]> {
    if (!canUsePrisma()) {
      let filtered = [...mockProjects]
      
      if (filters.status) {
        filtered = filtered.filter(p => p.status === filters.status)
      }
      if (filters.ward) {
        filtered = filtered.filter(p => p.ward === filters.ward)
      }
      if (filters.type) {
        filtered = filtered.filter(p => p.type === filters.type)
      }
      
      return filtered.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 10))
    }

    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.ward) where.ward = filters.ward
    if (filters.type) where.type = filters.type

    return await prisma.project.findMany({
      where,
      include: {
        projectMilestones: {
          orderBy: { date: 'asc' }
        },
        budgetLines: {
          orderBy: { category: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
    })
  }

  /**
   * Update project
   */
  static async updateProject(
    id: string,
    data: z.infer<typeof projectUpdateSchema>,
    userId: string
  ): Promise<Project> {
    const validatedData = projectUpdateSchema.parse(data)

    if (!canUsePrisma()) {
      const mockProject = mockProjects.find(p => p.id === id)
      if (!mockProject) {
        throw new Error('Project not found')
      }
      
      Object.assign(mockProject, validatedData, { updatedAt: new Date() })
      console.log('Mock project updated:', id)
      return mockProject
    }

    const project = await prisma.project.update({
      where: { id },
      data: validatedData,
    })

    await createAuditLog({
      action: 'UPDATE',
      resource: 'Project',
      resourceId: id,
      actorId: userId,
      metadata: validatedData,
    })

    return project
  }

  /**
   * Calculate budget summary for project
   */
  static async getBudgetSummary(projectId: string): Promise<BudgetSummary> {
    if (!canUsePrisma()) {
      // Mock budget summary
      return {
        totalAllocated: 500000,
        totalSpent: 250000,
        totalCommitted: 100000,
        remaining: 150000,
        categories: {
          'Materials': { allocated: 200000, spent: 100000, committed: 50000 },
          'Labor': { allocated: 200000, spent: 120000, committed: 30000 },
          'Equipment': { allocated: 100000, spent: 30000, committed: 20000 },
        }
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        budgetLines: true
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    const categories: Record<string, { allocated: number; spent: number; committed: number }> = {}
    let totalAllocated = 0
    let totalSpent = 0
    let totalCommitted = 0

    for (const line of project.budgetLines) {
      const allocated = Number(line.allocated)
      const spent = Number(line.spent)
      const committed = Number(line.committed)

      totalAllocated += allocated
      totalSpent += spent
      totalCommitted += committed

      if (!categories[line.category]) {
        categories[line.category] = { allocated: 0, spent: 0, committed: 0 }
      }

      categories[line.category].allocated += allocated
      categories[line.category].spent += spent
      categories[line.category].committed += committed
    }

    return {
      totalAllocated,
      totalSpent,
      totalCommitted,
      remaining: totalAllocated - totalSpent - totalCommitted,
      categories,
    }
  }

  /**
   * Add budget line to project
   */
  static async addBudgetLine(
    projectId: string,
    data: z.infer<typeof budgetLineCreateSchema>,
    userId: string
  ): Promise<BudgetLine> {
    const validatedData = budgetLineCreateSchema.parse(data)

    if (!canUsePrisma()) {
      const mockBudgetLine = {
        id: `mock-budget-${Date.now()}`,
        projectId,
        category: validatedData.category,
        subcategory: validatedData.subcategory || null,
        allocated: validatedData.allocated,
        spent: 0,
        committed: 0,
        description: validatedData.description || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      console.log('Mock budget line created:', mockBudgetLine.id)
      return mockBudgetLine as BudgetLine
    }

    const budgetLine = await prisma.budgetLine.create({
      data: {
        projectId,
        ...validatedData,
        allocated: validatedData.allocated,
      },
    })

    await createAuditLog({
      action: 'CREATE',
      resource: 'BudgetLine',
      resourceId: budgetLine.id,
      actorId: userId,
      metadata: { projectId, category: validatedData.category, allocated: validatedData.allocated },
    })

    return budgetLine
  }

  /**
   * Add milestone to project
   */
  static async addMilestone(
    projectId: string,
    data: z.infer<typeof milestoneCreateSchema>,
    userId: string
  ): Promise<Milestone> {
    const validatedData = milestoneCreateSchema.parse(data)

    if (!canUsePrisma()) {
      const mockMilestone = {
        id: `mock-milestone-${Date.now()}`,
        projectId,
        title: validatedData.title,
        date: validatedData.date,
        progress: 0,
        notes: validatedData.notes || null,
        photos: validatedData.photos,
        geo: validatedData.geo || null,
        latitude: validatedData.latitude || null,
        longitude: validatedData.longitude || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      console.log('Mock milestone created:', mockMilestone.id)
      return mockMilestone as Milestone
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        ...validatedData,
      },
    })

    await createAuditLog({
      action: 'CREATE',
      resource: 'Milestone',
      resourceId: milestone.id,
      actorId: userId,
      metadata: { projectId, title: validatedData.title, date: validatedData.date },
    })

    return milestone
  }

  /**
   * Get projects for mapping (with geographic data)
   */
  static async getProjectsForMap(bounds?: {
    north: number
    south: number
    east: number
    west: number
  }): Promise<Array<Project & { milestones: Milestone[] }>> {
    if (!canUsePrisma()) {
      return mockProjects.map(p => ({
        ...p,
        milestones: []
      }))
    }

    const where: any = {
      OR: [
        { geo: { not: null } },
        {
          projectMilestones: {
            some: {
              AND: [
                { latitude: { not: null } },
                { longitude: { not: null } }
              ]
            }
          }
        }
      ]
    }

    // Add bounding box filter if provided
    if (bounds) {
      where.projectMilestones = {
        some: {
          AND: [
            { latitude: { gte: bounds.south } },
            { latitude: { lte: bounds.north } },
            { longitude: { gte: bounds.west } },
            { longitude: { lte: bounds.east } }
          ]
        }
      }
    }

    return await prisma.project.findMany({
      where,
      include: {
        projectMilestones: {
          where: {
            AND: [
              { latitude: { not: null } },
              { longitude: { not: null } }
            ]
          },
          orderBy: { date: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }
}
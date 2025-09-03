/**
 * Projects API Route
 * Handles CRUD operations for projects
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { ProjectService } from '@/lib/projects/service'
import { hasPermission, checkPermission } from '@/lib/rbac/permissions'
import { z } from 'zod'

const projectQuerySchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  ward: z.string().optional(),
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = projectQuerySchema.parse({
      status: searchParams.get('status'),
      ward: searchParams.get('ward'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    const projects = await ProjectService.listProjects(query)

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: projects.length === query.limit,
      }
    })
  } catch (error) {
    console.error('Projects GET error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch projects' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions for project creation
    if (!await checkPermission(session.user.id, 'projects', 'create')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const project = await ProjectService.createProject(body, session.user.id)

    return NextResponse.json({
      success: true,
      data: project,
    }, { status: 201 })
  } catch (error) {
    console.error('Projects POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create project' 
      },
      { status: 500 }
    )
  }
}
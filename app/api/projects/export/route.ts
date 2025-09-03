/**
 * Projects CSV Export API Route
 * Returns project data as CSV for download
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { ProjectService } from '@/lib/projects/service'
import { convertProjectsToCSV, convertBudgetToCSV, generateFilename } from '@/lib/projects/csv-export'
import { checkPermission } from '@/lib/rbac/permissions'
import { z } from 'zod'

const exportQuerySchema = z.object({
  type: z.enum(['projects', 'budget']).default('projects'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  ward: z.string().optional(),
  projectType: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions for data export
    if (!await checkPermission(session.user.id, 'projects', 'read')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = exportQuerySchema.parse({
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      ward: searchParams.get('ward'),
      projectType: searchParams.get('projectType'),
    })

    let csvContent: string
    let filename: string

    if (query.type === 'budget') {
      // Export budget breakdown
      // For now, we'll get all projects and extract budget lines
      const projects = await ProjectService.listProjects({
        status: query.status,
        ward: query.ward,
        type: query.projectType,
        limit: 1000, // Get all projects
      })

      const budgetLines = projects.flatMap(project => 
        project.budgetLines?.map((line: any) => ({
          ...line,
          project: { title: project.title }
        })) || []
      )

      csvContent = convertBudgetToCSV(budgetLines)
      filename = generateFilename('budget_breakdown')
    } else {
      // Export projects
      const projects = await ProjectService.listProjects({
        status: query.status,
        ward: query.ward,
        type: query.projectType,
        limit: 1000, // Get all projects for export
      })

      csvContent = convertProjectsToCSV(projects)
      filename = generateFilename('projects_export')
    }

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Projects export error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid parameters',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to export data' 
      },
      { status: 500 }
    )
  }
}
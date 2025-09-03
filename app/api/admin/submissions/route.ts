/**
 * Admin Submissions API Route
 * CRUD operations for submission management
 * Part of PR07: Form Builder & SLA Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { formService, SubmissionStatus } from '@/lib/forms/service'
import { slaEngine } from '@/lib/forms/sla'
import { z } from 'zod'

// Validation schemas
const GetSubmissionsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  formId: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED']).optional(),
  assignedTo: z.string().optional(),
  overdue: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'slaDue', 'status', 'formName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

/**
 * GET /api/admin/submissions
 * List submissions with filtering, searching, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'submissions', 'read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const params = {
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '10', 10),
      formId: searchParams.get('formId') || undefined,
      status: searchParams.get('status') as SubmissionStatus | undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      overdue: searchParams.get('overdue') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    }

    const validation = GetSubmissionsSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const validParams = validation.data

    // Get submissions
    const result = await formService.getSubmissions({
      page: validParams.page,
      limit: validParams.limit,
      formId: validParams.formId,
      status: validParams.status,
      assignedTo: validParams.assignedTo,
      overdue: validParams.overdue,
    })

    // Get SLA stats for dashboard
    const slaStats = await formService.getSlaStats()

    return NextResponse.json({
      success: true,
      data: {
        submissions: result.submissions,
        pagination: result.pagination,
        stats: slaStats,
      },
    })

  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/submissions
 * Bulk update submissions
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'submissions', 'update')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { submissionIds, status, assignedTo } = body

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { error: 'Submission IDs are required' },
        { status: 400 }
      )
    }

    // Bulk update submissions
    await formService.bulkUpdateSubmissions(
      submissionIds,
      { status, assignedTo },
      session.user.id
    )

    return NextResponse.json({
      success: true,
      message: `Updated ${submissionIds.length} submissions successfully`,
    })

  } catch (error) {
    console.error('Error updating submissions:', error)
    return NextResponse.json(
      { error: 'Failed to update submissions' },
      { status: 500 }
    )
  }
}
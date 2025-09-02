/**
 * Admin Submissions API - Individual Submission Operations
 * GET /api/admin/submissions/[id] - Get submission details
 * PUT /api/admin/submissions/[id] - Update submission status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { SubmissionService, StatusUpdate } from '@/lib/forms/submissions'

const service = new SubmissionService()

interface Context {
  params: { id: string }
}

const StatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED']),
  assignedTo: z.string().optional(),
  note: z.string().max(1000).optional(),
  resolution: z.string().max(2000).optional(),
  rejectionReason: z.string().max(1000).optional()
})

/**
 * GET /api/admin/submissions/[id]
 * Get submission details
 */
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'submissions:read'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = context.params
    
    const submission = await service.getSubmission(id)
    
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: submission
    })
    
  } catch (error) {
    console.error('Get submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/submissions/[id]
 * Update submission status
 */
export async function PUT(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'forms:create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = context.params
    const body = await request.json()
    
    const statusUpdate = StatusUpdateSchema.parse(body)
    
    const submission = await service.updateSubmissionStatus(
      id,
      statusUpdate,
      session.user.id
    )
    
    return NextResponse.json({
      success: true,
      data: submission
    })
    
  } catch (error) {
    console.error('Update submission error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
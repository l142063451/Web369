/**
 * Admin Submission by ID API Route
 * Individual submission CRUD operations
 * Part of PR07: Form Builder & SLA Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { formService, SubmissionStatus } from '@/lib/forms/service'
import { slaEngine } from '@/lib/forms/sla'
import { z } from 'zod'

interface RouteParams {
  params: { id: string }
}

// Validation schemas
const UpdateSubmissionSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED']).optional(),
  assignedTo: z.string().nullish(),
  notes: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
})

/**
 * GET /api/admin/submissions/[id]
 * Get submission by ID with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const submission = await formService.getSubmission(params.id)
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Calculate SLA information
    const form = submission.form
    let slaInfo = null
    if (form) {
      const formSchema = form.schema as any
      const category = formSchema?.settings?.category || 'general'
      const config = slaEngine.getDefaultSlaConfig(category)
      
      slaInfo = slaEngine.calculateSlaDue(
        submission.createdAt,
        form.slaDays,
        config
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...submission,
        slaInfo,
      },
    })

  } catch (error) {
    console.error('Error fetching submission:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/submissions/[id]
 * Update submission status, assignment, etc.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateSubmissionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { status, assignedTo, notes, resolvedAt } = validation.data

    // Prepare update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo
    if (resolvedAt && status === 'RESOLVED') {
      updateData.resolvedAt = new Date(resolvedAt)
    }

    // Add history entry with notes if provided
    if (notes) {
      updateData.history = [{
        timestamp: new Date(),
        status: status || 'UPDATE',
        notes,
        userId: session.user.id,
      }]
    }

    const submission = await formService.updateSubmission(
      params.id,
      updateData,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: submission,
    })

  } catch (error) {
    console.error('Error updating submission:', error)
    
    if (error instanceof Error && error.message === 'Submission not found') {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/submissions/[id]
 * Delete submission (hard delete for admin purposes)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (only admins should be able to delete)
    const hasPermission = await checkPermission(session.user.id, 'submissions', 'delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Note: This would need to be implemented in the form service
    // For now, we'll return a placeholder response
    return NextResponse.json(
      { error: 'Deletion not implemented - submissions should be marked as resolved instead' },
      { status: 501 }
    )

  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    )
  }
}
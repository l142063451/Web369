/**
 * Admin Form by ID API Route
 * Individual form CRUD operations
 * Part of PR07: Form Builder & SLA Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { formService } from '@/lib/forms/service'
import { z } from 'zod'

interface RouteParams {
  params: { id: string }
}

// Validation schema for updates
const UpdateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(z.any()),
    settings: z.object({
      category: z.string(),
      slaDays: z.number().min(1).max(365),
      requiresAuth: z.boolean(),
      allowAnonymous: z.boolean(),
      notificationTemplate: z.string().optional(),
      redirectUrl: z.string().url().optional(),
    }),
  }).optional(),
  slaDays: z.number().min(1).max(365).optional(),
  workflow: z.record(z.any()).optional(),
  active: z.boolean().optional(),
})

/**
 * GET /api/admin/forms/[id]
 * Get form by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'forms', 'read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await formService.getForm(params.id)
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: form,
    })

  } catch (error) {
    console.error('Error fetching form:', error)
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/forms/[id]
 * Update form by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'forms', 'update')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateFormSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const form = await formService.updateForm(params.id, validation.data, session.user.id)

    return NextResponse.json({
      success: true,
      data: form,
    })

  } catch (error) {
    console.error('Error updating form:', error)
    
    if (error instanceof Error && error.message === 'Form not found') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/forms/[id]
 * Delete form by ID (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'forms', 'delete')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await formService.deleteForm(params.id, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting form:', error)
    
    if (error instanceof Error && error.message === 'Form not found') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    )
  }
}
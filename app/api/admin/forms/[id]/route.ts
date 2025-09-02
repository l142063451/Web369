/**
 * Admin Forms API - Individual Form Operations
 * GET /api/admin/forms/[id] - Get form
 * PUT /api/admin/forms/[id] - Update form  
 * DELETE /api/admin/forms/[id] - Delete form
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { FormService, FormSchema } from '@/lib/forms/service'

const service = new FormService()

interface Context {
  params: { id: string }
}

/**
 * GET /api/admin/forms/[id]
 * Get form by ID
 */
export async function GET(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'forms:read'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = context.params
    const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true'
    
    const form = await service.getForm(id, includeInactive)
    
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: form
    })
    
  } catch (error) {
    console.error('Get form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/forms/[id]
 * Update form
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
    
    // Validate update data
    const updateData = FormSchema.partial().parse(body)
    
    const form = await service.updateForm(id, updateData, session.user.id)
    
    return NextResponse.json({
      success: true,
      data: form
    })
    
  } catch (error) {
    console.error('Update form error:', error)
    
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

/**
 * DELETE /api/admin/forms/[id]
 * Delete (deactivate) form
 */
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'forms:delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = context.params
    
    await service.deleteForm(id, session.user.id)
    
    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete form error:', error)
    
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
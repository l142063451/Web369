/**
 * Admin Forms API - CRUD Operations
 * POST /api/admin/forms - Create form
 * GET /api/admin/forms - List forms
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { FormService, FormSchema } from '@/lib/forms/service'

const service = new FormService()

/**
 * POST /api/admin/forms
 * Create new form
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'forms:create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const formData = FormSchema.parse(body)
    
    const form = await service.createForm(formData, session.user.id)
    
    return NextResponse.json({
      success: true,
      data: form
    })
    
  } catch (error) {
    console.error('Create form error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
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
 * GET /api/admin/forms
 * List forms with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'forms:read'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active') === 'false' ? false : true
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    const result = await service.listForms({ active, search, limit, offset })
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('List forms error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
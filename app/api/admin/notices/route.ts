/**
 * Admin Notices API - POST /api/admin/notices (Create), GET (List)
 * PR12 - Admin CRUD operations for notices
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/auth/rbac'
import { NoticesService, CreateNoticeSchema } from '@/lib/news-events'

// GET /api/admin/notices - List all notices (admin view)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage content
    const canManage = await checkPermission(session.user.id, 'CONTENT', 'WRITE')
    if (!canManage) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined
    const hasDeadline = searchParams.get('hasDeadline') === 'true' ? true : undefined
    const isActive = searchParams.get('isActive') === 'true' ? true : undefined

    const result = await NoticesService.list({
      page,
      limit,
      search,
      category,
      hasDeadline,
      isActive
    })

    return Response.json({
      success: true,
      data: result.notices,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching admin notices:', error)
    return Response.json(
      { success: false, error: error.message || 'Failed to fetch notices' },
      { status: 500 }
    )
  }
}

// POST /api/admin/notices - Create new notice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create content
    const canCreate = await checkPermission(session.user.id, 'CONTENT', 'WRITE')
    if (!canCreate) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate the data
    const validatedData = CreateNoticeSchema.parse(body)

    // Create the notice
    const notice = await NoticesService.create(validatedData, session.user.id)

    return Response.json({
      success: true,
      data: notice
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating notice:', error)
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return Response.json(
      { success: false, error: error.message || 'Failed to create notice' },
      { status: 500 }
    )
  }
}
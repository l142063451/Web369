/**
 * Admin Notices API - Individual Notice Operations
 * PUT /api/admin/notices/[id] (Update), DELETE /api/admin/notices/[id] (Delete)
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/auth/rbac'
import { NoticesService, UpdateNoticeSchema } from '@/lib/news-events'

interface RouteParams {
  params: { id: string }
}

// PUT /api/admin/notices/[id] - Update notice
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update content
    const canUpdate = await checkPermission(session.user.id, 'CONTENT', 'WRITE')
    if (!canUpdate) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate the data
    const validatedData = UpdateNoticeSchema.parse({ ...body, id: params.id })

    // Update the notice
    const notice = await NoticesService.update(validatedData, session.user.id)

    return Response.json({
      success: true,
      data: notice
    })
  } catch (error: any) {
    console.error('Error updating notice:', error)
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return Response.json(
      { success: false, error: error.message || 'Failed to update notice' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/notices/[id] - Delete notice
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to delete content
    const canDelete = await checkPermission(session.user.id, 'CONTENT', 'DELETE')
    if (!canDelete) {
      return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the notice
    await NoticesService.delete(params.id, session.user.id)

    return Response.json({
      success: true,
      message: 'Notice deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting notice:', error)
    return Response.json(
      { success: false, error: error.message || 'Failed to delete notice' },
      { status: 500 }
    )
  }
}
/**
 * Admin News API - Individual Article Operations
 * PUT /api/admin/news/[id] (Update), DELETE /api/admin/news/[id] (Delete)
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/auth/rbac'
import { NewsService, UpdateNewsSchema } from '@/lib/news-events'

interface RouteParams {
  params: { id: string }
}

// PUT /api/admin/news/[id] - Update news article
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
    const validatedData = UpdateNewsSchema.parse({ ...body, id: params.id })

    // Update the news article
    const news = await NewsService.update(validatedData, session.user.id)

    return Response.json({
      success: true,
      data: news
    })
  } catch (error: any) {
    console.error('Error updating news:', error)
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return Response.json(
      { success: false, error: error.message || 'Failed to update news article' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/news/[id] - Delete news article
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

    // Delete the news article
    await NewsService.delete(params.id, session.user.id)

    return Response.json({
      success: true,
      message: 'News article deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting news:', error)
    return Response.json(
      { success: false, error: error.message || 'Failed to delete news article' },
      { status: 500 }
    )
  }
}
/**
 * Admin News API - POST /api/admin/news (Create), GET (List with all statuses)
 * PUT /api/admin/news/[id], DELETE /api/admin/news/[id]
 * PR12 - Admin CRUD operations for news
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/auth/rbac'
import { NewsService, CreateNewsSchema } from '@/lib/news-events'

// GET /api/admin/news - List all news (admin view)
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
    const status = searchParams.get('status') as 'DRAFT' | 'STAGED' | 'PUBLISHED' | undefined

    const result = await NewsService.list({
      page,
      limit,
      search,
      status
    })

    return Response.json({
      success: true,
      data: result.news,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching admin news:', error)
    return Response.json(
      { success: false, error: error.message || 'Failed to fetch news' },
      { status: 500 }
    )
  }
}

// POST /api/admin/news - Create new news article
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
    const validatedData = CreateNewsSchema.parse(body)

    // Create the news article
    const news = await NewsService.create(validatedData, session.user.id)

    return Response.json({
      success: true,
      data: news
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating news:', error)
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    return Response.json(
      { success: false, error: error.message || 'Failed to create news article' },
      { status: 500 }
    )
  }
}
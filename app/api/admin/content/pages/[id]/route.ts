/**
 * Admin Content API - Individual Page Management
 * GET /api/admin/content/pages/[id] - Get specific page
 * PUT /api/admin/content/pages/[id] - Update specific page
 * DELETE /api/admin/content/pages/[id] - Delete specific page
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { ContentService } from '@/lib/content/service'

const UpdatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  blocks: z.array(z.any()).optional(),
  seo: z.object({
    title: z.string().max(60).optional(),
    description: z.string().max(160).optional(),
    keywords: z.array(z.string()).optional(),
    ogTitle: z.string().max(60).optional(),
    ogDescription: z.string().max(160).optional(),
    ogImage: z.string().url().optional(),
    canonical: z.string().url().optional(),
    noindex: z.boolean().optional(),
    nofollow: z.boolean().optional(),
  }).optional(),
  status: z.enum(['DRAFT', 'STAGED', 'PUBLISHED']).optional(),
})

/**
 * GET /api/admin/content/pages/[id]
 * Get specific page by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'content:read'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const page = await ContentService.getPageById(params.id)
    
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: page,
    })
    
  } catch (error) {
    console.error('Get page error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/content/pages/[id]
 * Update specific page
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'content:edit'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const validated = UpdatePageSchema.parse(body)
    
    const page = await ContentService.updatePage(
      params.id,
      validated,
      session.user.id
    )
    
    return NextResponse.json({
      success: true,
      data: page,
    })
    
  } catch (error) {
    console.error('Update page error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/content/pages/[id]
 * Delete specific page
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'content:delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    await ContentService.deletePage(params.id, session.user.id)
    
    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully',
    })
    
  } catch (error) {
    console.error('Delete page error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
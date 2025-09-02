/**
 * Admin Content API - Pages Management
 * POST /api/admin/content/pages - Create page
 * GET /api/admin/content/pages - List pages
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { ContentService } from '@/lib/content/service'

const CreatePageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  locale: z.string().length(2).default('en'),
  blocks: z.array(z.any()).default([]),
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
})

const ListPagesSchema = z.object({
  status: z.enum(['DRAFT', 'STAGED', 'PUBLISHED']).optional(),
  locale: z.string().length(2).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
})

/**
 * POST /api/admin/content/pages
 * Create new page
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'content:create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const validated = CreatePageSchema.parse(body)
    
    const page = await ContentService.createPage(validated, session.user.id)
    
    return NextResponse.json({
      success: true,
      data: page,
    })
    
  } catch (error) {
    console.error('Create page error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/content/pages
 * List pages with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'content:read'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const params = {
      status: searchParams.get('status'),
      locale: searchParams.get('locale'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      search: searchParams.get('search'),
    }
    
    const validated = ListPagesSchema.parse(params)
    const result = await ContentService.listPages(validated)
    
    return NextResponse.json({
      success: true,
      data: result.pages,
      meta: {
        total: result.total,
        limit: validated.limit,
        offset: validated.offset,
        hasMore: result.total > validated.offset + validated.limit,
      },
    })
    
  } catch (error) {
    console.error('List pages error:', error)
    
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
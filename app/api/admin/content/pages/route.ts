import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin } from '@/lib/rbac/permissions'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/audit/logger'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const window = new JSDOM('').window
const purify = DOMPurify(window)

// GET /api/admin/content/pages - List all pages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessAdmin(session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const locale = searchParams.get('locale')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status) where.status = status
    if (locale) where.locale = locale

    const pages = await prisma.page.findMany({
      where,
      include: {
        createdByUser: { select: { name: true, email: true } },
        updatedByUser: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.page.count({ where })

    return NextResponse.json({
      pages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch pages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/content/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessAdmin(session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, slug, locale = 'en', blocks = [], seo = {} } = body

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingPage = await prisma.page.findUnique({
      where: { slug },
    })

    if (existingPage) {
      return NextResponse.json(
        { error: 'A page with this slug already exists' },
        { status: 409 }
      )
    }

    // Sanitize HTML content in blocks
    const sanitizedBlocks = blocks.map((block: any) => {
      if (block.type === 'text' && block.content) {
        return {
          ...block,
          content: purify.sanitize(block.content, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
          }),
        }
      }
      return block
    })

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        locale,
        blocks: sanitizedBlocks,
        seo,
        status: 'DRAFT',
        version: 1,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
      include: {
        createdByUser: { select: { name: true, email: true } },
        updatedByUser: { select: { name: true, email: true } },
      },
    })

    // Log audit event
    await auditLogger.log(session.user.id, 'CREATE', 'page', page.id, {
      title: page.title,
      slug: page.slug,
      status: page.status,
    })

    return NextResponse.json({ page }, { status: 201 })
  } catch (error) {
    console.error('Failed to create page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/content/pages - Update an existing page
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessAdmin(session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, title, slug, locale, blocks = [], seo = {} } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      )
    }

    // Get existing page for audit
    const existingPage = await prisma.page.findUnique({
      where: { id },
    })

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Check slug uniqueness if changed
    if (slug !== existingPage.slug) {
      const slugExists = await prisma.page.findFirst({
        where: { slug, id: { not: id } },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'A page with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Sanitize HTML content in blocks
    const sanitizedBlocks = blocks.map((block: any) => {
      if (block.type === 'text' && block.content) {
        return {
          ...block,
          content: purify.sanitize(block.content, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
          }),
        }
      }
      return block
    })

    const page = await prisma.page.update({
      where: { id },
      data: {
        title,
        slug,
        locale,
        blocks: sanitizedBlocks,
        seo,
        version: { increment: 1 },
        updatedBy: session.user.id,
      },
      include: {
        createdByUser: { select: { name: true, email: true } },
        updatedByUser: { select: { name: true, email: true } },
      },
    })

    // Log audit event with diff
    const changes = {
      title: title !== existingPage.title ? { from: existingPage.title, to: title } : undefined,
      slug: slug !== existingPage.slug ? { from: existingPage.slug, to: slug } : undefined,
      locale: locale !== existingPage.locale ? { from: existingPage.locale, to: locale } : undefined,
      blocksChanged: JSON.stringify(blocks) !== JSON.stringify(existingPage.blocks),
      seoChanged: JSON.stringify(seo) !== JSON.stringify(existingPage.seo),
    }

    await auditLogger.log(session.user.id, 'UPDATE', 'page', page.id, changes)

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Failed to update page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
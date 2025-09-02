import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin } from '@/lib/rbac/permissions'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/audit/logger'

// POST /api/admin/content/pages/[id]/publish - Publish a page
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessAdmin(session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params

    // Get current page status
    const currentPage = await prisma.page.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true, status: true },
    })

    if (!currentPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    if (currentPage.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Page is already published' },
        { status: 409 }
      )
    }

    // Update page status to published
    const page = await prisma.page.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        updatedBy: session.user.id,
      },
      include: {
        createdByUser: { select: { name: true, email: true } },
        updatedByUser: { select: { name: true, email: true } },
      },
    })

    // Log audit event
    await auditLogger.log(session.user.id, 'PUBLISH', 'page', page.id, {
      title: page.title,
      slug: page.slug,
      fromStatus: currentPage.status,
      toStatus: 'PUBLISHED',
      publishedAt: page.publishedAt,
    })

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Failed to publish page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
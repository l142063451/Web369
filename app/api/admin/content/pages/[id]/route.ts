import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin } from '@/lib/rbac/permissions'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/audit/logger'

// DELETE /api/admin/content/pages/[id] - Delete a page
export async function DELETE(
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

    // Get page for audit log before deletion
    const page = await prisma.page.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true, status: true },
    })

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Don't allow deletion of published pages without explicit confirmation
    if (page.status === 'PUBLISHED') {
      const forceDelete = request.headers.get('x-force-delete')
      if (!forceDelete) {
        return NextResponse.json(
          { error: 'Cannot delete published page. Use x-force-delete header to override.' },
          { status: 409 }
        )
      }
    }

    await prisma.page.delete({
      where: { id },
    })

    // Log audit event
    await auditLogger.log(session.user.id, 'DELETE', 'page', page.id, {
      title: page.title,
      slug: page.slug,
      status: page.status,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
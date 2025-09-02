import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin } from '@/lib/rbac/permissions'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/audit/logger'

// GET /api/admin/media - List all media files
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
    const isPublic = searchParams.get('public')
    const scanned = searchParams.get('scanned')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (isPublic !== null) where.isPublic = isPublic === 'true'
    if (scanned === 'true') where.scannedAt = { not: null }
    if (scanned === 'false') where.scannedAt = null

    const files = await prisma.media.findMany({
      where,
      include: {
        createdByUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.media.count({ where })

    return NextResponse.json({
      files,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch media files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
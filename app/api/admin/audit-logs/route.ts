import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/rbac/permissions'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canViewAudit = await hasPermission(session.user.id, 'system:audit')
    if (!canViewAudit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const actorId = searchParams.get('actorId')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (action) {
      where.action = action
    }
    
    if (resource) {
      where.resource = {
        contains: resource,
        mode: 'insensitive' as const
      }
    }
    
    if (actorId) {
      where.actorId = actorId
    }

    // Get total count
    const total = await prisma.auditLog.count({ where })

    // Get audit logs with pagination
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
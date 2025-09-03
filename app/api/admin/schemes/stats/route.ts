import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { SchemesService } from '@/lib/eligibility/schemes'
import { authOptions } from '@/lib/auth/authOptions'

// GET /api/admin/schemes/stats - Get scheme statistics (Admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.roles?.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stats = await SchemesService.getSchemeStats()

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching scheme stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
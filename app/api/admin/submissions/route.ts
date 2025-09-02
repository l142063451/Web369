/**
 * Admin Submissions API - List and Manage Submissions
 * GET /api/admin/submissions - List submissions with filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { SubmissionService } from '@/lib/forms/submissions'

const service = new SubmissionService()

/**
 * GET /api/admin/submissions
 * List submissions with filtering and SLA info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'submissions:read'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const filter: any = {
      formId: searchParams.get('formId') || undefined,
      status: searchParams.get('status') as any || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      userId: searchParams.get('userId') || undefined,
      slaStatus: searchParams.get('slaStatus') as any || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10)
    }
    
    const result = await service.listSubmissions(filter)
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('List submissions error:', error)
    
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
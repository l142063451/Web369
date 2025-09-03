/**
 * Admin Directory API - PR13
 * CRUD operations for directory entries (SHGs/businesses/jobs/training)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { DirectoryService, CreateDirectoryEntrySchema, DirectoryFiltersSchema } from '@/lib/directory/service'

// GET /api/admin/directory - List directory entries with admin filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !await checkPermission(session.user.id, 'directory', 'read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    
    // Validate type parameter
    const typeParam = url.searchParams.get('type')
    const validType = typeParam && ['SHG', 'BUSINESS', 'JOB', 'TRAINING'].includes(typeParam) 
      ? typeParam as 'SHG' | 'BUSINESS' | 'JOB' | 'TRAINING' 
      : undefined
    
    const filters = {
      type: validType,
      category: url.searchParams.get('category') || undefined,
      search: url.searchParams.get('search') || undefined,
      approved: url.searchParams.get('approved') ? url.searchParams.get('approved') === 'true' : undefined,
      hasGeo: url.searchParams.get('hasGeo') ? url.searchParams.get('hasGeo') === 'true' : undefined,
      userId: url.searchParams.get('userId') || undefined,
      page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 12
    }

    const result = await DirectoryService.list(filters)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Admin directory list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch directory entries' },
      { status: 500 }
    )
  }
}

// POST /api/admin/directory - Create directory entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !await checkPermission(session.user.id, 'directory', 'write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateDirectoryEntrySchema.parse(body)

    const entry = await DirectoryService.create(validatedData, session.user.id)
    return NextResponse.json(entry, { status: 201 })

  } catch (error) {
    console.error('Directory creation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create directory entry' },
      { status: 500 }
    )
  }
}
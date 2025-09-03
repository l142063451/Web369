/**
 * Admin Directory Entry API - PR13
 * Individual entry operations (GET/PUT/DELETE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { DirectoryService, UpdateDirectoryEntrySchema } from '@/lib/directory/service'

// GET /api/admin/directory/[id] - Get single entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !await checkPermission(session.user.id, 'directory', 'read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const entry = await DirectoryService.getById(params.id, session.user.id)
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json(entry)

  } catch (error) {
    console.error('Directory entry fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch directory entry' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/directory/[id] - Update entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !await checkPermission(session.user.id, 'directory', 'write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateDirectoryEntrySchema.parse({
      ...body,
      id: params.id
    })

    const entry = await DirectoryService.update(validatedData, session.user.id)
    return NextResponse.json(entry)

  } catch (error) {
    console.error('Directory update error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update directory entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/directory/[id] - Delete entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !await checkPermission(session.user.id, 'directory', 'delete')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await DirectoryService.delete(params.id, session.user.id)
    return NextResponse.json({ message: 'Entry deleted successfully' })

  } catch (error) {
    console.error('Directory delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete directory entry' },
      { status: 500 }
    )
  }
}
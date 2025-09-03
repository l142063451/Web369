import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { SchemesService } from '@/lib/eligibility/schemes'
import { authOptions } from '@/lib/auth/authOptions'

// GET /api/schemes/[id] - Get single scheme
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scheme = await SchemesService.getScheme(params.id)

    if (!scheme) {
      return NextResponse.json({ error: 'Scheme not found' }, { status: 404 })
    }

    return NextResponse.json({ scheme })
  } catch (error) {
    console.error('Error fetching scheme:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheme' },
      { status: 500 }
    )
  }
}

// PUT /api/schemes/[id] - Update scheme (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.roles?.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const UpdateSchemeSchema = z.object({
      title: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      criteria: z.unknown().optional(),
      docsRequired: z.array(z.string()).optional(),
      processSteps: z.array(z.string()).optional(),
      links: z.array(z.string()).optional(),
      active: z.boolean().optional()
    })

    const body = await request.json()
    const data = UpdateSchemeSchema.parse(body)

    const scheme = await SchemesService.updateScheme(params.id, data)

    return NextResponse.json({ scheme })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating scheme:', error)
    return NextResponse.json(
      { error: 'Failed to update scheme' },
      { status: 500 }
    )
  }
}

// DELETE /api/schemes/[id] - Delete scheme (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.roles?.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await SchemesService.deleteScheme(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scheme:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheme' },
      { status: 500 }
    )
  }
}
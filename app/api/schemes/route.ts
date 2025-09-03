import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { SchemesService } from '@/lib/eligibility/schemes'
import { authOptions } from '@/lib/auth/authOptions'

// GET /api/schemes - List schemes with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined
    const active = searchParams.get('active') !== 'false'

    const schemes = await SchemesService.getSchemes({ category, search, active })

    return NextResponse.json({ schemes })
  } catch (error) {
    console.error('Error fetching schemes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schemes' },
      { status: 500 }
    )
  }
}

// POST /api/schemes - Create new scheme (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (assuming role is in session)
    if (!session.user.roles?.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const CreateSchemeSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      category: z.string().min(1, 'Category is required'),
      criteria: z.unknown().optional(),
      docsRequired: z.array(z.string()).default([]),
      processSteps: z.array(z.string()).default([]),
      links: z.array(z.string()).default([]),
      active: z.boolean().default(true)
    })

    const body = await request.json()
    const data = CreateSchemeSchema.parse(body)

    const scheme = await SchemesService.createScheme(data)

    return NextResponse.json({ scheme }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating scheme:', error)
    return NextResponse.json(
      { error: 'Failed to create scheme' },
      { status: 500 }
    )
  }
}
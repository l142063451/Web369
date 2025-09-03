import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { SchemesService } from '@/lib/eligibility/schemes'
import { authOptions } from '@/lib/auth/authOptions'

// POST /api/schemes/[id]/eligibility - Check eligibility for a scheme
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    const CheckEligibilitySchema = z.object({
      answers: z.record(z.unknown())
    })

    const body = await request.json()
    const { answers } = CheckEligibilitySchema.parse(body)

    const result = await SchemesService.checkEligibility({
      schemeId: params.id,
      userId: session?.user?.id,
      answers
    })

    return NextResponse.json({ result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    console.error('Error checking eligibility:', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    )
  }
}
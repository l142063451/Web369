/**
 * Project Budget API Route
 * Returns budget summary and breakdown for Sankey visualization
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/lib/projects/service'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const budgetSummary = await ProjectService.getBudgetSummary(id)

    return NextResponse.json({
      success: true,
      data: budgetSummary
    })
  } catch (error) {
    console.error('Project budget API error:', error)
    
    if (error instanceof Error && error.message === 'Project not found') {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch budget summary' 
      },
      { status: 500 }
    )
  }
}
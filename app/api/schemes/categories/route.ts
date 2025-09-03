import { NextResponse } from 'next/server'
import { SchemesService } from '@/lib/eligibility/schemes'

// GET /api/schemes/categories - Get scheme categories
export async function GET() {
  try {
    const categories = await SchemesService.getCategories()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching scheme categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
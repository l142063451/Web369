/**
 * Directory Statistics API - PR13
 * Public statistics for directory entries
 */

import { NextResponse } from 'next/server'
import { DirectoryService } from '@/lib/directory/service'

// GET /api/directory/stats - Public directory statistics
export async function GET() {
  try {
    const [stats, categories] = await Promise.all([
      DirectoryService.getStats(),
      DirectoryService.getCategories()
    ])

    return NextResponse.json({
      stats,
      categories: categories.slice(0, 20) // Limit to top 20 categories
    })

  } catch (error) {
    console.error('Directory stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch directory statistics' },
      { status: 500 }
    )
  }
}
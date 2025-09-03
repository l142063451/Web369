/**
 * Notices API Endpoints - GET /api/notices
 * Public endpoint for fetching notices
 */

import { NextRequest } from 'next/server'
import { NoticesService, NoticeFiltersSchema } from '@/lib/news-events'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const filters = {
      category: searchParams.get('category') || undefined,
      hasDeadline: searchParams.get('hasDeadline') ? searchParams.get('hasDeadline') === 'true' : undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    // Validate filters
    const validatedFilters = NoticeFiltersSchema.parse(filters)
    
    // Get notices
    const result = await NoticesService.list(validatedFilters)
    
    return Response.json({
      success: true,
      data: result.notices,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching notices:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch notices' 
      },
      { status: 500 }
    )
  }
}
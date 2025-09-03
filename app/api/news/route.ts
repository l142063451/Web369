/**
 * News API Endpoints - GET /api/news
 * Public endpoint for fetching published news articles
 */

import { NextRequest } from 'next/server'
import { NewsService, NewsFiltersSchema } from '@/lib/news-events'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const filters = {
      status: 'PUBLISHED' as const, // Only show published news publicly
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    }

    // Validate filters
    const validatedFilters = NewsFiltersSchema.parse(filters)
    
    // Get news
    const result = await NewsService.list(validatedFilters)
    
    return Response.json({
      success: true,
      data: result.news,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Error fetching news:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch news' 
      },
      { status: 500 }
    )
  }
}
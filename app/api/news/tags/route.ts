/**
 * News Tags API - GET /api/news/tags
 * Returns all available tags from published news articles
 */

import { NewsService } from '@/lib/news-events'

export async function GET() {
  try {
    const tags = await NewsService.getTags()
    
    return Response.json({
      success: true,
      data: tags
    })
  } catch (error: any) {
    console.error('Error fetching news tags:', error)
    return Response.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}
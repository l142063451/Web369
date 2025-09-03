/**
 * News API Endpoints - GET /api/news/[slug]
 * Public endpoint for fetching a single news article by slug
 */

import { NewsService } from '@/lib/news-events'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    if (!slug) {
      return Response.json(
        { success: false, error: 'Slug is required' },
        { status: 400 }
      )
    }

    // Get news by slug
    const news = await NewsService.getBySlug(slug)
    
    if (!news) {
      return Response.json(
        { success: false, error: 'News article not found' },
        { status: 404 }
      )
    }

    // Only return published news publicly
    if (news.status !== 'PUBLISHED') {
      return Response.json(
        { success: false, error: 'News article not found' },
        { status: 404 }
      )
    }
    
    return Response.json({
      success: true,
      data: news
    })
  } catch (error: any) {
    console.error('Error fetching news article:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch news article' 
      },
      { status: 500 }
    )
  }
}
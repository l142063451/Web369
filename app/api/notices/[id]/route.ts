/**
 * Notices API Endpoints - GET /api/notices/[id]
 * Public endpoint for fetching a single notice by ID
 */

import { NoticesService } from '@/lib/news-events'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return Response.json(
        { success: false, error: 'Notice ID is required' },
        { status: 400 }
      )
    }

    // Get notice by ID
    const notice = await NoticesService.getById(id)
    
    if (!notice) {
      return Response.json(
        { success: false, error: 'Notice not found' },
        { status: 404 }
      )
    }
    
    return Response.json({
      success: true,
      data: notice
    })
  } catch (error: any) {
    console.error('Error fetching notice:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch notice' 
      },
      { status: 500 }
    )
  }
}
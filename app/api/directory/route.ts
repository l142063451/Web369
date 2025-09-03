/**
 * Public Directory API - PR13
 * Citizen-facing directory listings (approved entries only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { DirectoryService } from '@/lib/directory/service'

// GET /api/directory - Public directory listings
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    
    // Validate type parameter
    const typeParam = url.searchParams.get('type')
    const validType = typeParam && ['SHG', 'BUSINESS', 'JOB', 'TRAINING'].includes(typeParam) 
      ? typeParam as 'SHG' | 'BUSINESS' | 'JOB' | 'TRAINING' 
      : undefined
    
    // Only show approved entries to public
    let filters: any = {
      type: validType,
      category: url.searchParams.get('category') || undefined,
      search: url.searchParams.get('search') || undefined,
      hasGeo: url.searchParams.get('hasGeo') ? url.searchParams.get('hasGeo') === 'true' : undefined,
      approved: true, // Force approved only for public API
      page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 12
    }

    // Parse bounds if provided for map filtering
    if (url.searchParams.get('bounds')) {
      try {
        const boundsParam = url.searchParams.get('bounds')!
        const [north, south, east, west] = boundsParam.split(',').map(parseFloat)
        if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
          filters.bounds = { north, south, east, west }
        }
      } catch {
        // Ignore invalid bounds
      }
    }

    const result = await DirectoryService.list(filters)
    
    // Remove sensitive information for public API
    const sanitizedResult = {
      ...result,
      entries: result.entries.map(entry => ({
        id: entry.id,
        type: entry.type,
        name: entry.name,
        description: entry.description,
        products: entry.products,
        geo: entry.geo,
        createdAt: entry.createdAt,
        // Only include contact info if it's public-facing
        contact: {
          email: entry.contact.email,
          website: entry.contact.website,
          address: entry.contact.address
          // Exclude phone for privacy
        }
      }))
    }

    return NextResponse.json(sanitizedResult)

  } catch (error) {
    console.error('Public directory list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch directory entries' },
      { status: 500 }
    )
  }
}
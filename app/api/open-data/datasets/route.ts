/**
 * Open Data API - Dataset Downloads
 * GET /api/open-data/datasets - List available datasets
 * 
 * Provides public access to open data catalog and metadata
 */

import { NextResponse } from 'next/server'
import { openDataService } from '@/lib/open-data'

export async function GET() {
  try {
    const catalog = await openDataService.getDataCatalog()
    
    return NextResponse.json(catalog, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error getting data catalog:', error)
    return NextResponse.json(
      { error: 'Failed to get data catalog' },
      { status: 500 }
    )
  }
}
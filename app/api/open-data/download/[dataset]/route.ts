/**
 * Open Data API - Download Specific Datasets
 * GET /api/open-data/download/[dataset] - Download dataset in requested format
 * 
 * Supports CSV, JSON downloads with proper content types and headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { openDataService } from '@/lib/open-data'
import { headers } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { dataset: string } }
) {
  const dataset = params.dataset
  const url = new URL(request.url)
  const format = url.searchParams.get('format') || 'csv'
  
  // Get client IP for tracking
  const headersList = headers()
  const clientIP = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'

  try {
    // Track download
    await openDataService.trackDownload(dataset.replace(/\.(csv|json|pdf)$/, ''), format, clientIP)

    let data: string
    let contentType: string
    let filename: string

    switch (dataset) {
      case 'projects.csv':
        data = await openDataService.exportProjects()
        contentType = 'text/csv'
        filename = 'village-projects.csv'
        break

      case 'schemes.json':
        const schemesData = await openDataService.exportSchemes()
        data = JSON.stringify(schemesData, null, 2)
        contentType = 'application/json'
        filename = 'government-schemes.json'
        break

      case 'events.csv':
        data = await openDataService.exportEvents()
        contentType = 'text/csv'
        filename = 'community-events.csv'
        break

      case 'directory.csv':
        data = await openDataService.exportDirectory()
        contentType = 'text/csv'
        filename = 'business-directory.csv'
        break

      case 'analytics-summary.json':
        const summaryData = await openDataService.generateAnalyticsSummary()
        data = JSON.stringify(summaryData, null, 2)
        contentType = 'application/json'
        filename = 'analytics-summary.json'
        break

      default:
        return NextResponse.json(
          { error: 'Dataset not found' },
          { status: 404 }
        )
    }

    // Return the data directly since we handle conversion above
    return new NextResponse(data as string, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Last-Modified': new Date().toUTCString(),
      },
    })
  } catch (error) {
    console.error(`Error downloading dataset ${dataset}:`, error)
    return NextResponse.json(
      { error: 'Failed to download dataset' },
      { status: 500 }
    )
  }
}
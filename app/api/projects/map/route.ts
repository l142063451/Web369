/**
 * Projects Map Data API Route
 * Returns projects and milestones formatted for map display
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/lib/projects/service'
import { z } from 'zod'

const mapQuerySchema = z.object({
  north: z.coerce.number().optional(),
  south: z.coerce.number().optional(),
  east: z.coerce.number().optional(),
  west: z.coerce.number().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bounds = mapQuerySchema.parse({
      north: searchParams.get('north'),
      south: searchParams.get('south'),
      east: searchParams.get('east'),
      west: searchParams.get('west'),
    })

    // Filter out undefined values
    const validBounds = Object.entries(bounds)
      .filter(([_, value]) => value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

    const projectsWithMap = await ProjectService.getProjectsForMap(
      Object.keys(validBounds).length === 4 ? validBounds as any : undefined
    )

    // Transform to map-friendly format
    const mapData = projectsWithMap.map(project => {
      // Extract coordinates from project geo data or first milestone
      let latitude: number | undefined
      let longitude: number | undefined

      if (project.geo && typeof project.geo === 'object' && 'coordinates' in project.geo) {
        const coords = (project.geo as any).coordinates
        if (Array.isArray(coords) && coords.length >= 2) {
          longitude = coords[0]
          latitude = coords[1]
        }
      } else if (project.milestones && project.milestones.length > 0) {
        const firstMilestone = project.milestones[0]
        if (firstMilestone.latitude && firstMilestone.longitude) {
          latitude = firstMilestone.latitude
          longitude = firstMilestone.longitude
        }
      }

      return {
        id: project.id,
        title: project.title,
        type: project.type,
        status: project.status,
        latitude,
        longitude,
        budget: Number(project.budget),
        spent: Number(project.spent),
        milestones: (project.milestones || []).map((milestone: any) => ({
          id: milestone.id,
          title: milestone.title,
          latitude: milestone.latitude,
          longitude: milestone.longitude,
          progress: milestone.progress,
          date: milestone.date.toISOString(),
        }))
      }
    }).filter(project => project.latitude && project.longitude) // Only include projects with coordinates

    return NextResponse.json({
      success: true,
      data: mapData,
      count: mapData.length
    })
  } catch (error) {
    console.error('Projects map data error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch map data' 
      },
      { status: 500 }
    )
  }
}
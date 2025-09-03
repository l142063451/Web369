/**
 * MapLibre Component for Project Locations
 * Displays projects and milestones on an interactive map
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, MapOptions, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Default map configuration for Uttarakhand region
const DEFAULT_MAP_CONFIG = {
  center: [79.6413, 29.5537] as [number, number], // Pithoragarh, Uttarakhand
  zoom: 10,
  style: {
    version: 8 as const,
    sources: {
      'osm-tiles': {
        type: 'raster' as const,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm-tiles',
        type: 'raster' as const,
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  }
}

export interface ProjectMapData {
  id: string
  title: string
  type: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  latitude: number
  longitude: number
  budget?: number
  spent?: number
  milestones?: Array<{
    id: string
    title: string
    latitude: number
    longitude: number
    progress: number
    date: string
  }>
}

interface MapLibreComponentProps {
  projects: ProjectMapData[]
  onProjectClick?: (project: ProjectMapData) => void
  onMilestoneClick?: (project: ProjectMapData, milestone: NonNullable<ProjectMapData['milestones']>[0]) => void
  height?: string
  className?: string
}

export default function MapLibreComponent({
  projects,
  onProjectClick,
  onMilestoneClick,
  height = '400px',
  className = ''
}: MapLibreComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      const mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: DEFAULT_MAP_CONFIG.style,
        center: DEFAULT_MAP_CONFIG.center,
        zoom: DEFAULT_MAP_CONFIG.zoom,
        attributionControl: false,
      })

      mapInstance.on('load', () => {
        setIsLoaded(true)
        setError(null)
      })

      mapInstance.on('error', (e) => {
        console.error('MapLibre error:', e)
        setError('Failed to load map')
      })

      map.current = mapInstance
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setError('Failed to initialize map')
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update markers when projects change
  useEffect(() => {
    if (!map.current || !isLoaded) return

    // Clear existing markers
    markers.current.forEach(marker => marker.remove())
    markers.current = []

    // Add project markers
    projects.forEach(project => {
      if (project.latitude && project.longitude) {
        const marker = createProjectMarker(project)
        markers.current.push(marker)
      }

      // Add milestone markers
      project.milestones?.forEach(milestone => {
        if (milestone.latitude && milestone.longitude) {
          const marker = createMilestoneMarker(project, milestone)
          markers.current.push(marker)
        }
      })
    })

    // Fit map to show all markers if we have projects
    if (projects.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      
      projects.forEach(project => {
        if (project.latitude && project.longitude) {
          bounds.extend([project.longitude, project.latitude])
        }
        project.milestones?.forEach(milestone => {
          if (milestone.latitude && milestone.longitude) {
            bounds.extend([milestone.longitude, milestone.latitude])
          }
        })
      })

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 })
      }
    }
  }, [projects, isLoaded, onProjectClick, onMilestoneClick])

  const createProjectMarker = (project: ProjectMapData): Marker => {
    const el = document.createElement('div')
    el.className = 'project-marker'
    el.innerHTML = `
      <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center text-xs font-bold text-white ${getProjectStatusColor(project.status)}">
        P
      </div>
    `

    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
      <div class="p-2 min-w-48">
        <h3 class="font-semibold text-sm mb-1">${project.title}</h3>
        <p class="text-xs text-gray-600 mb-1">Type: ${project.type}</p>
        <p class="text-xs text-gray-600 mb-1">Status: ${project.status}</p>
        ${project.budget ? `<p class="text-xs text-gray-600">Budget: ₹${project.budget.toLocaleString()}</p>` : ''}
        ${project.spent ? `<p class="text-xs text-gray-600">Spent: ₹${project.spent.toLocaleString()}</p>` : ''}
      </div>
    `)

    const marker = new maplibregl.Marker(el)
      .setLngLat([project.longitude, project.latitude])
      .setPopup(popup)
      .addTo(map.current!)

    el.addEventListener('click', () => {
      if (onProjectClick) {
        onProjectClick(project)
      }
    })

    return marker
  }

  const createMilestoneMarker = (project: ProjectMapData, milestone: NonNullable<ProjectMapData['milestones']>[0]): Marker => {
    const el = document.createElement('div')
    el.className = 'milestone-marker'
    el.innerHTML = `
      <div class="w-6 h-6 rounded-full border-2 border-white shadow-md cursor-pointer flex items-center justify-center text-xs font-bold text-white ${getMilestoneProgressColor(milestone.progress)}">
        M
      </div>
    `

    const popup = new maplibregl.Popup({ offset: 15 }).setHTML(`
      <div class="p-2 min-w-40">
        <h4 class="font-semibold text-xs mb-1">${milestone.title}</h4>
        <p class="text-xs text-gray-600 mb-1">Project: ${project.title}</p>
        <p class="text-xs text-gray-600 mb-1">Progress: ${milestone.progress}%</p>
        <p class="text-xs text-gray-600">Date: ${new Date(milestone.date).toLocaleDateString()}</p>
      </div>
    `)

    const marker = new maplibregl.Marker(el)
      .setLngLat([milestone.longitude, milestone.latitude])
      .setPopup(popup)
      .addTo(map.current!)

    el.addEventListener('click', () => {
      if (onMilestoneClick) {
        onMilestoneClick(project, milestone)
      }
    })

    return marker
  }

  const getProjectStatusColor = (status: string): string => {
    switch (status) {
      case 'PLANNED': return 'bg-blue-500'
      case 'IN_PROGRESS': return 'bg-yellow-500'
      case 'COMPLETED': return 'bg-green-500'
      case 'CANCELLED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getMilestoneProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-400'
    if (progress >= 75) return 'bg-yellow-400'
    if (progress >= 25) return 'bg-blue-400'
    return 'bg-gray-400'
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center border border-red-200 bg-red-50 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center text-red-600">
          <p className="text-sm font-medium">Map Error</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ height }}>
      <div 
        ref={mapContainer} 
        className="w-full h-full"
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs">
        <h4 className="font-semibold mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Planned Projects</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>Milestones</span>
          </div>
        </div>
      </div>
    </div>
  )
}
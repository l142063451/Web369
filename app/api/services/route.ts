/**
 * Services API - PR08
 * Handles citizen service requests and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/authOptions'
import { getAllServiceCategories } from '@/lib/services/config'
import { getServiceStats } from '@/lib/services/service'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'catalog':
        // Return service catalog
        const services = getAllServiceCategories()
        return NextResponse.json({ services })
        
      case 'stats':
        // Return service statistics
        const stats = await getServiceStats()
        return NextResponse.json({ stats })
        
      default:
        // Default: return available services
        const allServices = getAllServiceCategories()
        return NextResponse.json({
          services: allServices.map(service => ({
            id: service.id,
            name: service.name,
            nameHi: service.nameHi,
            description: service.description,
            descriptionHi: service.descriptionHi,
            icon: service.icon,
            color: service.color,
            slaDays: service.slaDays,
            requiresDocuments: service.requiresDocuments
          }))
        })
    }
  } catch (error) {
    console.error('Services API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

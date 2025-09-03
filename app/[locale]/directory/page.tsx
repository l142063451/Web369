/**
 * Citizen Directory Page - PR13
 * Public directory of SHGs, businesses, jobs, and training programs
 */

'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Building2, MapPin, Search, Filter, Phone, Mail, Globe, ExternalLink, Briefcase, Users, GraduationCap, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import MapLibreComponent from '@/components/maps/MapLibreComponent'

interface DirectoryEntry {
  id: string
  type: 'SHG' | 'BUSINESS' | 'JOB' | 'TRAINING'
  name: string
  description?: string
  contact: {
    email?: string
    phone?: string
    address?: string
    website?: string
  }
  products: {
    items?: string[]
    services?: string[]
    skills?: string[]
    categories?: string[]
  }
  geo?: {
    latitude?: number
    longitude?: number
    address?: string
  }
  createdAt: string
}

interface DirectoryListResponse {
  entries: DirectoryEntry[]
  total: number
  page: number
  totalPages: number
}

const typeConfig = {
  SHG: {
    label: 'Self Help Groups',
    icon: Users,
    color: 'bg-green-100 text-green-800',
    description: 'Community-based mutual support groups'
  },
  BUSINESS: {
    label: 'Businesses',
    icon: Store,
    color: 'bg-blue-100 text-blue-800',
    description: 'Local businesses and enterprises'
  },
  JOB: {
    label: 'Jobs',
    icon: Briefcase,
    color: 'bg-purple-100 text-purple-800',
    description: 'Employment opportunities'
  },
  TRAINING: {
    label: 'Training',
    icon: GraduationCap,
    color: 'bg-orange-100 text-orange-800',
    description: 'Training programs and courses'
  }
}

export default function DirectoryPage() {
  const t = useTranslations('directory')
  const [entries, setEntries] = useState<DirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    search: '',
    hasGeo: false,
    page: 1
  })
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [stats, setStats] = useState({
    SHG: 0,
    BUSINESS: 0,
    JOB: 0,
    TRAINING: 0
  })

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      if (filters.hasGeo) params.append('hasGeo', 'true')
      params.append('page', filters.page.toString())
      params.append('limit', '12')

      const response = await fetch(`/api/directory?${params}`)
      if (!response.ok) throw new Error('Failed to fetch directory entries')

      const data: DirectoryListResponse = await response.json()
      setEntries(data.entries)
      setTotal(data.total)
      setTotalPages(data.totalPages)

      // Calculate stats
      const newStats = data.entries.reduce((acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1
        return acc
      }, {} as any)
      setStats(newStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch directory entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [filters])

  const handleContactClick = (type: 'phone' | 'email' | 'website', value: string) => {
    if (type === 'phone') {
      window.open(`tel:${value}`)
    } else if (type === 'email') {
      window.open(`mailto:${value}`)
    } else if (type === 'website') {
      window.open(value, '_blank')
    }
  }

  const resetFilters = () => {
    setFilters({ type: '', category: '', search: '', hasGeo: false, page: 1 })
  }

  // Map data for MapLibre (adapting to ProjectMapData interface)
  const mapEntries = entries
    .filter(entry => entry.geo?.latitude && entry.geo?.longitude)
    .map(entry => ({
      id: entry.id,
      title: entry.name,
      type: entry.type,
      status: 'COMPLETED' as const, // All approved directory entries are "completed"
      latitude: entry.geo!.latitude!,
      longitude: entry.geo!.longitude!,
      description: entry.description || '',
      address: entry.geo!.address || ''
    }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Village Directory</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Discover local businesses, self-help groups, job opportunities, and training programs in our community
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {Object.entries(typeConfig).map(([key, config]) => {
            const Icon = config.icon
            const count = stats[key as keyof typeof stats] || 0
            return (
              <div 
                key={key}
                className="bg-white rounded-lg shadow-sm p-6 border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilters({ ...filters, type: key, page: 1 })}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{config.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                  <Icon className="h-8 w-8 text-gray-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">{config.description}</p>
              </div>
            )
          })}
        </div>

        {/* Filters & View Toggle */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, category, or skill..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  />
                </div>
              </div>

              {/* Type Filter */}
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-48"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
              >
                <option value="">All Types</option>
                <option value="SHG">Self Help Groups</option>
                <option value="BUSINESS">Businesses</option>
                <option value="JOB">Jobs</option>
                <option value="TRAINING">Training</option>
              </select>

              {/* Location Filter */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasGeo}
                  onChange={(e) => setFilters({ ...filters, hasGeo: e.target.checked, page: 1 })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show only geo-located</span>
              </label>

              {/* Reset */}
              <Button variant="outline" onClick={resetFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Reset
              </Button>

              {/* View Toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'map' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setViewMode('map')}
                >
                  Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading directory entries...</p>
          </div>
        )}

        {/* Map View */}
        {!loading && viewMode === 'map' && mapEntries.length > 0 && (
          <div className="mb-8">
            <div className="h-96 rounded-lg overflow-hidden border">
              <MapLibreComponent
                projects={mapEntries}
                onProjectClick={(project: any) => {
                  console.log('Selected directory entry:', project)
                }}
              />
            </div>
          </div>
        )}

        {/* Grid View */}
        {!loading && viewMode === 'grid' && entries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {entries.map((entry) => {
              const config = typeConfig[entry.type]
              const Icon = config.icon
              return (
                <div key={entry.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Icon className="h-8 w-8 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge className={config.color}>
                            {config.label}
                          </Badge>
                          <h3 className="font-semibold text-gray-900 mt-1 mb-1">{entry.name}</h3>
                          {entry.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{entry.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      {entry.contact.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                          <button 
                            className="hover:text-blue-600 transition-colors"
                            onClick={() => handleContactClick('phone', entry.contact.phone!)}
                          >
                            {entry.contact.phone}
                          </button>
                        </div>
                      )}
                      {entry.contact.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                          <button 
                            className="hover:text-blue-600 transition-colors"
                            onClick={() => handleContactClick('email', entry.contact.email!)}
                          >
                            {entry.contact.email}
                          </button>
                        </div>
                      )}
                      {entry.contact.website && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                          <button 
                            className="hover:text-blue-600 transition-colors flex items-center"
                            onClick={() => handleContactClick('website', entry.contact.website!)}
                          >
                            <span>Visit Website</span>
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </button>
                        </div>
                      )}
                      {entry.geo?.address && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>{entry.geo.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Categories/Services */}
                    {(entry.products.categories?.length || entry.products.services?.length || 
                      entry.products.items?.length || entry.products.skills?.length) && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          {entry.type === 'JOB' ? 'Skills Required' : 
                           entry.type === 'TRAINING' ? 'Skills Taught' : 'Categories'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[
                            ...(entry.products.categories || []),
                            ...(entry.products.services || []),
                            ...(entry.products.items || []),
                            ...(entry.products.skills || [])
                          ].slice(0, 4).map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t">
                      <Button className="w-full" size="sm">
                        Contact & Enquiry
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && entries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No entries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or search terms.
            </p>
            <Button onClick={resetFilters} className="mt-4">
              Reset Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-lg border p-6">
            <p className="text-sm text-gray-700">
              Showing {((filters.page - 1) * 12) + 1} to {Math.min(filters.page * 12, total)} of {total} results
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                Previous
              </Button>
              <Button 
                variant="outline"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
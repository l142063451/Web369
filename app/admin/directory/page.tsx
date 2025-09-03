/**
 * Admin Directory Management - PR13
 * Directory & Economy management interface for SHGs, businesses, jobs, and training
 */

'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Search, Filter, MapPin, Eye, Edit, Trash2, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  approved: boolean
  createdAt: string
  updatedAt: string
}

interface DirectoryListResponse {
  entries: DirectoryEntry[]
  total: number
  page: number
  totalPages: number
}

const typeLabels = {
  SHG: 'Self Help Group',
  BUSINESS: 'Business',
  JOB: 'Job',
  TRAINING: 'Training'
}

const typeColors = {
  SHG: 'bg-green-100 text-green-800',
  BUSINESS: 'bg-blue-100 text-blue-800', 
  JOB: 'bg-purple-100 text-purple-800',
  TRAINING: 'bg-orange-100 text-orange-800'
}

export default function DirectoryAdminPage() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    type: '',
    approved: '',
    search: '',
    page: 1
  })
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.approved !== '') params.append('approved', filters.approved)
      if (filters.search) params.append('search', filters.search)
      params.append('page', filters.page.toString())
      params.append('limit', '12')

      const response = await fetch(`/api/admin/directory?${params}`)
      if (!response.ok) throw new Error('Failed to fetch entries')

      const data: DirectoryListResponse = await response.json()
      setEntries(data.entries)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [filters])

  const handleApproval = async (id: string, approved: boolean) => {
    try {
      const response = await fetch(`/api/admin/directory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      })
      
      if (!response.ok) throw new Error('Failed to update approval status')
      
      setEntries(entries.map(entry => 
        entry.id === id ? { ...entry, approved } : entry
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await fetch(`/api/admin/directory/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete entry')
      
      setEntries(entries.filter(entry => entry.id !== id))
      setTotal(total - 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  const resetFilters = () => {
    setFilters({ type: '', approved: '', search: '', page: 1 })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Directory & Economy</h1>
            <p className="text-gray-600">Manage SHGs, businesses, jobs, and training programs</p>
          </div>
        </div>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Entry</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {entries.filter(e => e.approved).length}
              </p>
            </div>
            <Check className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-orange-600">
                {entries.filter(e => !e.approved).length}
              </p>
            </div>
            <X className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Geo-located</p>
              <p className="text-2xl font-bold text-purple-600">
                {entries.filter(e => e.geo?.latitude).length}
              </p>
            </div>
            <MapPin className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search entries..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                />
              </div>
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            >
              <option value="">All Types</option>
              <option value="SHG">Self Help Groups</option>
              <option value="BUSINESS">Businesses</option>
              <option value="JOB">Jobs</option>
              <option value="TRAINING">Training</option>
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.approved}
              onChange={(e) => setFilters({ ...filters, approved: e.target.value, page: 1 })}
            >
              <option value="">All Status</option>
              <option value="true">Approved</option>
              <option value="false">Pending</option>
            </select>
            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading entries...</p>
        </div>
      )}

      {/* Entries Grid */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={typeColors[entry.type]}>
                        {typeLabels[entry.type]}
                      </Badge>
                      {entry.approved ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800">
                          <X className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{entry.name}</h3>
                    {entry.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{entry.description}</p>
                    )}
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {entry.contact.phone && (
                    <div>Phone: {entry.contact.phone}</div>
                  )}
                  {entry.contact.email && (
                    <div>Email: {entry.contact.email}</div>
                  )}
                  {entry.geo?.address && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {entry.geo.address}
                    </div>
                  )}
                </div>

                {/* Products/Services */}
                {(entry.products.categories?.length || entry.products.services?.length) && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {entry.products.categories?.slice(0, 3).map((category, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                      {entry.products.services?.slice(0, 2).map((service, idx) => (
                        <Badge key={`service-${idx}`} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>View</span>
                    </Button>
                    <Button size="sm" variant="outline" className="flex items-center space-x-1">
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    {!entry.approved && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApproval(entry.id, true)}
                      >
                        Approve
                      </Button>
                    )}
                    {entry.approved && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleApproval(entry.id, false)}
                      >
                        Unapprove
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No directory entries</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first directory entry.</p>
          <div className="mt-6">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
  )
}
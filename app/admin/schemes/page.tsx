'use client'

import { useEffect, useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Scheme {
  id: string
  title: string
  category: string
  active: boolean
  docsRequired: string[]
  processSteps: string[]
  createdAt: string
  updatedAt: string
}

interface SchemeStats {
  total: number
  active: number
  inactive: number
  byCategory: { category: string; _count: { id: number } }[]
  eligibilityRunsLast30Days: number
}

export default function AdminSchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [stats, setStats] = useState<SchemeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    fetchSchemes()
    fetchStats()
  }, [selectedCategory, searchTerm])

  const fetchSchemes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (searchTerm) params.set('search', searchTerm)
      params.set('active', 'all') // Show both active and inactive in admin

      const response = await fetch(`/api/schemes?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setSchemes(data.schemes)
      } else {
        console.error('Failed to fetch schemes:', data.error)
      }
    } catch (error) {
      console.error('Error fetching schemes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/schemes/stats')
      const data = await response.json()
      
      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/schemes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchSchemes()
        await fetchStats()
      } else {
        const data = await response.json()
        console.error('Failed to delete scheme:', data.error)
      }
    } catch (error) {
      console.error('Error deleting scheme:', error)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/schemes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: !currentStatus
        }),
      })

      if (response.ok) {
        await fetchSchemes()
        await fetchStats()
      } else {
        const data = await response.json()
        console.error('Failed to toggle scheme status:', data.error)
      }
    } catch (error) {
      console.error('Error toggling scheme status:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schemes Management</h1>
          <p className="text-gray-600">Manage government schemes and eligibility criteria</p>
        </div>
        <Link href="/admin/schemes/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Scheme
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Inactive Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Eligibility Checks (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.eligibilityRunsLast30Days}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          type="text"
          placeholder="Search schemes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sm:max-w-xs"
        />

        <Select onValueChange={setSelectedCategory} defaultValue="">
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {stats?.byCategory.map((cat) => (
              <SelectItem key={cat.category} value={cat.category}>
                {cat.category} ({cat._count.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Schemes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Schemes</CardTitle>
          <CardDescription>
            {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : schemes.length > 0 ? (
            <div className="space-y-4">
              {schemes.map((scheme) => (
                <div key={scheme.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{scheme.title}</h3>
                        <Badge variant="secondary">{scheme.category}</Badge>
                        <Badge variant={scheme.active ? "default" : "destructive"}>
                          {scheme.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{scheme.docsRequired.length} documents required</span>
                        <span>{scheme.processSteps.length} process steps</span>
                        <span>Updated {new Date(scheme.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/schemes/${scheme.id}`} target="_blank">
                        <Button variant="outline" size="sm">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      <Link href={`/admin/schemes/${scheme.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(scheme.id, scheme.active)}
                      >
                        {scheme.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(scheme.id, scheme.title)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No schemes found.</p>
              <Link href="/admin/schemes/new">
                <Button className="mt-4 bg-green-600 hover:bg-green-700">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Scheme
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
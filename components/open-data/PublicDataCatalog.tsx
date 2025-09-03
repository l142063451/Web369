/**
 * Public Data Catalog Component
 * PR15 - Analytics, SEO & Open Data
 * 
 * Public interface for browsing and downloading open datasets
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Search, Calendar, FileText, ExternalLink } from 'lucide-react'

interface Dataset {
  name: string
  description: string
  category: string
  format: 'csv' | 'json' | 'pdf'
  updateFrequency: string
  lastUpdated: Date
  recordCount: number
  downloadUrl: string
  license: string
}

interface DataCatalog {
  title: string
  description: string
  publisher: string
  license: string
  lastUpdated: string
  totalDatasets: number
  datasets: Dataset[]
  downloadStats: {
    totalDownloads: number
    popularDatasets: string[]
  }
}

export function PublicDataCatalog() {
  const [catalog, setCatalog] = useState<DataCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [formatFilter, setFormatFilter] = useState<string>('')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetchCatalog()
  }, [])

  const fetchCatalog = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/open-data/datasets')
      if (!response.ok) throw new Error('Failed to fetch catalog')
      
      const catalogData = await response.json()
      setCatalog(catalogData)
    } catch (error) {
      console.error('Error fetching catalog:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadDataset = async (dataset: Dataset) => {
    setDownloading(dataset.name)
    try {
      const filename = dataset.downloadUrl.split('/').pop() || 'dataset'
      const response = await fetch(dataset.downloadUrl)
      
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const filteredDatasets = catalog?.datasets.filter((dataset) => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dataset.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || dataset.category === categoryFilter
    const matchesFormat = !formatFilter || dataset.format === formatFilter
    
    return matchesSearch && matchesCategory && matchesFormat
  }) || []

  const categories = Array.from(new Set(catalog?.datasets.map(d => d.category) || []))
  const formats = Array.from(new Set(catalog?.datasets.map(d => d.format) || []))

  const formatFileSize = (records: number) => {
    if (records < 1000) return `${records} records`
    if (records < 1000000) return `${(records / 1000).toFixed(1)}K records`
    return `${(records / 1000000).toFixed(1)}M records`
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Governance': 'bg-blue-100 text-blue-800',
      'Welfare': 'bg-green-100 text-green-800',
      'Community': 'bg-purple-100 text-purple-800',
      'Economy': 'bg-orange-100 text-orange-800',
      'Transparency': 'bg-gray-100 text-gray-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="h-5 w-64 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!catalog) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load data catalog. Please try again later.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Catalog Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{catalog.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {catalog.description}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <span className="font-medium">Publisher:</span> {catalog.publisher}
            </div>
            <div>
              <span className="font-medium">Total Datasets:</span> {catalog.totalDatasets}
            </div>
            <div>
              <span className="font-medium">License:</span> {catalog.license}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search datasets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="md:w-32">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Formats</SelectItem>
                {formats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Datasets */}
      <Card>
        <CardHeader>
          <CardTitle>Available Datasets ({filteredDatasets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDatasets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No datasets found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDatasets.map((dataset) => (
                <div key={dataset.name} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{dataset.name}</h3>
                        <Badge className={getCategoryColor(dataset.category)}>
                          {dataset.category}
                        </Badge>
                        <Badge variant="outline">
                          {dataset.format.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        {dataset.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Updated {new Date(dataset.lastUpdated).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {formatFileSize(dataset.recordCount)}
                        </span>
                        <span>Updated {dataset.updateFrequency}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => downloadDataset(dataset)}
                        disabled={downloading === dataset.name}
                      >
                        {downloading === dataset.name ? (
                          'Downloading...'
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>License: {dataset.license}</span>
                    <span>Format: {dataset.format.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Downloads */}
      {catalog.downloadStats.popularDatasets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Downloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {catalog.downloadStats.popularDatasets.map((dataset) => (
                <Badge key={dataset} variant="secondary" className="cursor-pointer"
                       onClick={() => setSearchTerm(dataset)}>
                  {dataset}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
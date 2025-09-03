/**
 * Open Data Manager Component
 * PR15 - Analytics, SEO & Open Data
 * 
 * Manage datasets, downloads, and generate transparency reports
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, FileText, Database, Calendar, ExternalLink, RefreshCw } from 'lucide-react'

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

export function OpenDataManager() {
  const [catalog, setCatalog] = useState<DataCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

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
    setGenerating(dataset.name)
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
      setGenerating(null)
    }
  }

  const generateReport = async () => {
    setGenerating('Monthly Report')
    try {
      const response = await fetch('/api/open-data/download/monthly-report.pdf')
      if (!response.ok) throw new Error('Report generation failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monthly-report-${new Date().getFullYear()}-${new Date().getMonth() + 1}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Report generation error:', error)
      alert('Report generation failed. Please try again.')
    } finally {
      setGenerating(null)
    }
  }

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
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-9 w-20 bg-muted rounded animate-pulse" />
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
            Failed to load data catalog
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Catalog Info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{catalog.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {catalog.description}
              </p>
            </div>
            <Button onClick={fetchCatalog} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Publisher</p>
              <p className="font-medium">{catalog.publisher}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">License</p>
              <p className="font-medium">{catalog.license}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date(catalog.lastUpdated).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue="datasets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="datasets">Datasets ({catalog.totalDatasets})</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Available Datasets
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Public datasets available for download and analysis
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {catalog.datasets.map((dataset) => (
                  <div key={dataset.name} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{dataset.name}</h3>
                          <Badge className={getCategoryColor(dataset.category)}>
                            {dataset.category}
                          </Badge>
                          <Badge variant="outline">
                            {dataset.format.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {dataset.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Updated {new Date(dataset.lastUpdated).toLocaleDateString()}
                          </span>
                          <span>{formatFileSize(dataset.recordCount)}</span>
                          <span>Updated {dataset.updateFrequency}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => downloadDataset(dataset)}
                          disabled={generating === dataset.name}
                          size="sm"
                        >
                          {generating === dataset.name ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Download
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={dataset.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transparency Reports
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive reports for public accountability
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Monthly Progress Report</h3>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive monthly summary of all activities, projects, and engagements
                      </p>
                    </div>
                    <Button
                      onClick={generateReport}
                      disabled={generating === 'Monthly Report'}
                    >
                      {generating === 'Monthly Report' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Generate PDF
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">Annual Transparency Report</h3>
                      <p className="text-sm text-muted-foreground">
                        Year-end comprehensive review of governance and development
                      </p>
                    </div>
                    <Button disabled variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Download Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Downloads</p>
                  <p className="text-2xl font-bold">{catalog.downloadStats.totalDownloads}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Popular Datasets</p>
                  <div className="flex flex-wrap gap-2">
                    {catalog.downloadStats.popularDatasets.map((dataset) => (
                      <Badge key={dataset} variant="secondary">
                        {dataset}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
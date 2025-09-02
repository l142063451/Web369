/**
 * Admin Content Manager Page
 * Based on INSTRUCTIONS_FOR_COPILOT.md §6
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Edit, Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Page {
  id: string
  slug: string
  title: string
  status: 'DRAFT' | 'STAGED' | 'PUBLISHED'
  locale: string
  updatedAt: string
  publishedAt: string | null
}

interface ContentManagerProps {}

export function ContentManager({}: ContentManagerProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPage, setNewPage] = useState({
    title: '',
    slug: '',
  })

  const loadPages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (searchTerm) {
        params.set('search', searchTerm)
      }

      const response = await fetch(`/api/admin/content/pages?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPages(data.data)
      }
    } catch (error) {
      console.error('Failed to load pages:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  const createPage = async () => {
    try {
      const response = await fetch('/api/admin/content/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPage),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setNewPage({ title: '', slug: '' })
        loadPages()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to create page:', error)
      alert('Failed to create page')
    }
  }

  const getStatusBadge = (status: Page['status']) => {
    const variants = {
      DRAFT: 'secondary',
      STAGED: 'outline',
      PUBLISHED: 'default',
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status.toLowerCase()}
      </Badge>
    )
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage pages, sections, and blocks with versioning
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Page</DialogTitle>
              <DialogDescription>
                Create a new content page with title and URL slug.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Title
                </label>
                <Input
                  value={newPage.title}
                  onChange={(e) => {
                    const title = e.target.value
                    setNewPage({
                      title,
                      slug: generateSlug(title),
                    })
                  }}
                  placeholder="Enter page title..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  URL Slug
                </label>
                <Input
                  value={newPage.slug}
                  onChange={(e) => setNewPage(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="page-url-slug"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={createPage}
                disabled={!newPage.title || !newPage.slug}
              >
                Create Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="STAGED">Staged</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pages List */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading pages...</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No pages found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPages.map((page) => (
              <div key={page.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {page.title}
                      </h3>
                      {getStatusBadge(page.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      /{page.slug}
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(page.updatedAt).toLocaleDateString()}
                      {page.publishedAt && (
                        <span className="ml-3">
                          Published: {new Date(page.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {page.status === 'PUBLISHED' && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${page.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/content/${page.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TiptapEditor } from './TiptapEditor'
import { 
  Plus, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Globe,
  Lock,
  Clock
} from 'lucide-react'

interface Page {
  id: string
  slug: string
  title: string
  locale: string
  status: 'DRAFT' | 'STAGED' | 'PUBLISHED'
  blocks: any[]
  seo: {
    title?: string
    description?: string
    keywords?: string[]
  }
  version: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  createdByUser: {
    name: string
    email: string
  }
  updatedByUser: {
    name: string
    email: string
  }
}

interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'gallery' | 'callout'
  content: any
  order: number
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  STAGED: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
}

const statusIcons = {
  DRAFT: Lock,
  STAGED: Clock,
  PUBLISHED: Globe,
}

export function ContentManagerView() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingContent, setEditingContent] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/admin/content/pages')
      if (response.ok) {
        const data = await response.json()
        setPages(data.pages)
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewPage = () => {
    setSelectedPage({
      id: '',
      slug: '',
      title: '',
      locale: 'en',
      status: 'DRAFT',
      blocks: [],
      seo: {},
      version: 1,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: { name: 'Current User', email: 'user@example.com' },
      updatedByUser: { name: 'Current User', email: 'user@example.com' },
    })
    setEditingContent('')
    setIsEditing(true)
  }

  const editPage = (page: Page) => {
    setSelectedPage(page)
    // Convert blocks to HTML for editor
    const htmlContent = page.blocks
      .map(block => block.type === 'text' ? block.content : '')
      .join('')
    setEditingContent(htmlContent)
    setIsEditing(true)
  }

  const savePage = async () => {
    if (!selectedPage) return

    try {
      const pageData = {
        ...selectedPage,
        blocks: [
          {
            id: '1',
            type: 'text',
            content: editingContent,
            order: 1,
          }
        ]
      }

      const response = await fetch('/api/admin/content/pages', {
        method: selectedPage.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData),
      })

      if (response.ok) {
        await fetchPages()
        setIsEditing(false)
        setSelectedPage(null)
      }
    } catch (error) {
      console.error('Failed to save page:', error)
    }
  }

  const deletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const response = await fetch(`/api/admin/content/pages/${pageId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPages()
      }
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
  }

  const publishPage = async (pageId: string) => {
    try {
      const response = await fetch(`/api/admin/content/pages/${pageId}/publish`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchPages()
      }
    } catch (error) {
      console.error('Failed to publish page:', error)
    }
  }

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex-1 max-w-lg">
          <Input
            type="text"
            placeholder="Search pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={createNewPage} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Page
        </Button>
      </div>

      {/* Page Editor Modal/Panel */}
      {isEditing && selectedPage && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">
              {selectedPage.id ? 'Edit Page' : 'Create New Page'}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setIsEditing(false)
                setSelectedPage(null)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Input
                  value={selectedPage.title}
                  onChange={(e) => setSelectedPage({
                    ...selectedPage,
                    title: e.target.value,
                    slug: selectedPage.slug || e.target.value.toLowerCase().replace(/\s+/g, '-')
                  })}
                  placeholder="Page title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <Input
                  value={selectedPage.slug}
                  onChange={(e) => setSelectedPage({
                    ...selectedPage,
                    slug: e.target.value
                  })}
                  placeholder="page-url-slug..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SEO Title
              </label>
              <Input
                value={selectedPage.seo.title || ''}
                onChange={(e) => setSelectedPage({
                  ...selectedPage,
                  seo: { ...selectedPage.seo, title: e.target.value }
                })}
                placeholder="SEO title for search engines..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SEO Description
              </label>
              <Input
                value={selectedPage.seo.description || ''}
                onChange={(e) => setSelectedPage({
                  ...selectedPage,
                  seo: { ...selectedPage.seo, description: e.target.value }
                })}
                placeholder="SEO description for search engines..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <TiptapEditor
                content={editingContent}
                onChange={setEditingContent}
                placeholder="Start writing your page content..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={savePage} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save {selectedPage.id ? 'Changes' : 'Page'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setSelectedPage(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages List */}
      <div className="grid gap-4">
        {filteredPages.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pages found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No pages match your search criteria.' : 'Get started by creating your first page.'}
              </p>
              {!searchTerm && (
                <Button onClick={createNewPage} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Page
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPages.map((page) => {
            const StatusIcon = statusIcons[page.status]
            return (
              <Card key={page.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{page.title}</CardTitle>
                        <Badge className={statusColors[page.status]} variant="secondary">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {page.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">/{page.slug}</p>
                      <p className="text-xs text-gray-400">
                        Updated {new Date(page.updatedAt).toLocaleDateString()} by {page.updatedByUser.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => editPage(page)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {page.status === 'DRAFT' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => publishPage(page.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          Publish
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deletePage(page.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
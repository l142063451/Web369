/**
 * Page Editor Component with Tiptap
 * Based on INSTRUCTIONS_FOR_COPILOT.md §6
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  Eye, 
  ArrowLeft, 
  Settings, 
  Upload,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Check,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { TiptapEditor } from './TiptapEditor'

interface Page {
  id: string
  slug: string
  title: string
  status: 'DRAFT' | 'STAGED' | 'PUBLISHED'
  locale: string
  blocks: any
  seo: any
  version: number
  updatedAt: Date
  publishedAt?: Date | null
}

interface PageEditorProps {
  page: Page
}

export function PageEditor({ page }: PageEditorProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState<Page>(page)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState('')

  // Initialize content from page blocks
  useEffect(() => {
    if (currentPage.blocks && currentPage.blocks.length > 0) {
      // For now, convert blocks to HTML - this would be enhanced later
      const htmlContent = currentPage.blocks
        .flatMap((section: any) => section.blocks)
        .map((block: any) => block.content?.html || '')
        .join('\n')
      setContent(htmlContent)
    }
  }, [currentPage.blocks])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setIsDirty(true)
  }, [])

  const handleTitleChange = useCallback((newTitle: string) => {
    setCurrentPage(prev => ({ ...prev, title: newTitle }))
    setIsDirty(true)
  }, [])

  const handleStatusChange = useCallback((newStatus: 'DRAFT' | 'STAGED' | 'PUBLISHED') => {
    setCurrentPage(prev => ({ ...prev, status: newStatus }))
    setIsDirty(true)
  }, [])

  const savePage = async () => {
    if (!isDirty) return

    setSaving(true)
    try {
      // Convert content back to blocks structure
      const blocks = [{
        id: 'main-section',
        title: 'Main Content',
        blocks: [{
          id: 'content-block',
          type: 'paragraph',
          content: { html: content },
          order: 0,
        }],
        order: 0,
      }]

      const response = await fetch(`/api/admin/content/pages/${currentPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentPage.title,
          status: currentPage.status,
          blocks,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentPage(data.data)
        setIsDirty(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save page')
      }
    } catch (error) {
      console.error('Failed to save page:', error)
      alert('Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: Page['status']) => {
    const variants = {
      DRAFT: 'secondary',
      STAGED: 'outline',
      PUBLISHED: 'default',
    } as const

    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      STAGED: 'bg-yellow-100 text-yellow-800',
      PUBLISHED: 'bg-green-100 text-green-800',
    }

    return (
      <Badge variant={variants[status]} className={`${colors[status]} capitalize`}>
        {status.toLowerCase()}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Edit Page
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>/{currentPage.slug}</span>
                  {getStatusBadge(currentPage.status)}
                  {isDirty && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentPage.status === 'PUBLISHED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/${currentPage.slug}`, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
              
              <Button
                onClick={savePage}
                disabled={!isDirty || saving}
                className="min-w-[100px]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : isDirty ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Editor */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Page Title
                  </label>
                  <Input
                    value={currentPage.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter page title..."
                    className="text-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Content
                  </label>
                  <TiptapEditor
                    content={content}
                    onChange={handleContentChange}
                    placeholder="Start writing your content..."
                    className="min-h-[500px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publishing */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-gray-900 mb-4">Publishing</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Status
                  </label>
                  <Select
                    value={currentPage.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="STAGED">Staged</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>Version: {currentPage.version}</p>
                  <p>Last updated: {new Date(currentPage.updatedAt).toLocaleDateString()}</p>
                  {currentPage.publishedAt && (
                    <p>Published: {new Date(currentPage.publishedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Page Settings */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-gray-900 mb-4">Page Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    URL Slug
                  </label>
                  <Input
                    value={currentPage.slug}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL slug cannot be changed after creation
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Language
                  </label>
                  <Input
                    value={currentPage.locale}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Media Library
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled
                >
                  <Settings className="h-4 w-4 mr-2" />
                  SEO Settings
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Version History
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
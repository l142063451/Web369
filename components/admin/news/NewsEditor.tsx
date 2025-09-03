/**
 * News Editor Component
 * PR12 - News/Notices/Events - Rich editor for creating and editing news
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Save, Eye, Calendar, Tag, Image as ImageIcon, Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TiptapEditor } from '@/components/admin/content/TiptapEditor'
import { MediaUpload } from '@/components/admin/content/MediaUpload'
import { CreateNewsSchema, UpdateNewsSchema, News } from '@/lib/news-events'
import type { NewsStatus } from '@/lib/news-events'

// Simple toast utility
const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' | 'default' }) => {
  // For now, just use console.log, can be replaced with proper toast implementation
  if (variant === 'destructive') {
    console.error(`${title}: ${description}`)
    alert(`Error: ${description}`)
  } else {
    console.log(`${title}: ${description}`)
    // Could show a temporary notification here
  }
}

const NewsEditorSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  content: z.string().min(1, 'Content is required'),
  featuredImage: z.string().url().optional().or(z.literal('')),
  tags: z.string().optional(),
  status: z.enum(['DRAFT', 'STAGED', 'PUBLISHED']).default('DRAFT'),
  publishedAt: z.string().optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.string().optional(),
})

type NewsEditorData = z.infer<typeof NewsEditorSchema>

interface NewsEditorProps {
  mode: 'create' | 'edit'
  news?: News
}

export function NewsEditor({ mode, news }: NewsEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const form = useForm<NewsEditorData>({
    resolver: zodResolver(NewsEditorSchema),
    defaultValues: {
      title: news?.title || '',
      slug: news?.slug || '',
      excerpt: news?.excerpt || '',
      content: news?.content || '',
      featuredImage: news?.featuredImage || '',
      tags: news?.tags.join(', ') || '',
      status: news?.status || 'DRAFT',
      publishedAt: news?.publishedAt ? new Date(news.publishedAt).toISOString().slice(0, 16) : '',
      seoTitle: news?.seo?.title || '',
      seoDescription: news?.seo?.description || '',
      seoKeywords: news?.seo?.keywords?.join(', ') || '',
    }
  })

  // Auto-generate slug from title
  const watchedTitle = form.watch('title')
  useEffect(() => {
    if (mode === 'create' && watchedTitle) {
      const slug = watchedTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim()
      form.setValue('slug', slug)
    }
  }, [watchedTitle, mode, form])

  // Load available tags
  useEffect(() => {
    fetch('/api/news/tags')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAvailableTags(data.data || [])
        }
      })
      .catch(console.error)
  }, [])

  const onSubmit = async (data: NewsEditorData) => {
    setIsLoading(true)
    try {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        featuredImage: data.featuredImage || undefined,
        seo: {
          title: data.seoTitle || undefined,
          description: data.seoDescription || undefined,
          keywords: data.seoKeywords ? data.seoKeywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
        }
      }

      const url = mode === 'create' ? '/api/admin/news' : `/api/admin/news/${news?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: mode === 'create' ? 'Article created' : 'Article updated',
          description: `News article has been ${mode === 'create' ? 'created' : 'updated'} successfully.`,
        })
        router.push('/admin/news')
      } else {
        throw new Error(result.error || 'Failed to save article')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save article',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Article Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Enter article title..."
                  className="mt-1"
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  {...form.register('slug')}
                  placeholder="article-url-slug"
                  className="mt-1"
                />
                {form.formState.errors.slug && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.slug.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  URL: /news/{form.watch('slug') || 'article-url-slug'}
                </p>
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  {...form.register('excerpt')}
                  placeholder="Brief summary of the article..."
                  className="mt-1"
                  rows={3}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Optional summary for article previews and SEO
                </p>
                {form.formState.errors.excerpt && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.excerpt.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreview(!isPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {isPreview ? 'Edit' : 'Preview'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isPreview ? (
                <div className="prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: form.watch('content') || '<p>No content yet...</p>' }} />
                </div>
              ) : (
                <TiptapEditor
                  content={form.watch('content')}
                  onChange={(content: string) => form.setValue('content', content)}
                  placeholder="Write your article content here..."
                />
              )}
              {form.formState.errors.content && (
                <p className="mt-2 text-sm text-red-600">{form.formState.errors.content.message}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.watch('status')} onValueChange={(value: NewsStatus) => form.setValue('status', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="STAGED">Staged</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.watch('status') === 'PUBLISHED' && (
                <div>
                  <Label htmlFor="publishedAt">Publish Date</Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    {...form.register('publishedAt')}
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Create' : 'Update'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Featured Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUpload
                accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
                maxFiles={1}
                onUploadComplete={(files) => {
                  if (files.length > 0) {
                    form.setValue('featuredImage', files[0].publicUrl)
                  }
                }}
              />
              {form.watch('featuredImage') && (
                <div className="mt-2">
                  <img 
                    src={form.watch('featuredImage')} 
                    alt="Featured" 
                    className="max-w-full h-32 object-cover rounded"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue('featuredImage', '')}
                    className="mt-1 text-red-600 hover:text-red-700"
                  >
                    Remove Image
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Input
                  {...form.register('tags')}
                  placeholder="tag1, tag2, tag3"
                  className="mb-2"
                />
                <p className="text-sm text-gray-500 mb-2">Separate tags with commas</p>
                {availableTags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Popular tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.slice(0, 10).map(tag => (
                        <Button
                          key={tag}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            const currentTags = form.watch('tags')
                            const tags = currentTags ? currentTags.split(',').map(t => t.trim()) : []
                            if (!tags.includes(tag)) {
                              form.setValue('tags', [...tags, tag].join(', '))
                            }
                          }}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                SEO Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">Meta Title</Label>
                <Input
                  id="seoTitle"
                  {...form.register('seoTitle')}
                  placeholder="Custom title for search engines"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {(form.watch('seoTitle') || '').length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea
                  id="seoDescription"
                  {...form.register('seoDescription')}
                  placeholder="Brief description for search results"
                  className="mt-1"
                  rows={3}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {(form.watch('seoDescription') || '').length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="seoKeywords">Keywords</Label>
                <Input
                  id="seoKeywords"
                  {...form.register('seoKeywords')}
                  placeholder="keyword1, keyword2, keyword3"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
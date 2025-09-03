/**
 * Notice Editor Component
 * PR12 - News/Notices/Events - Editor for creating and editing notices
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Save, Calendar, FileText, Upload, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MediaUpload } from '@/components/admin/content/MediaUpload'
import { CreateNoticeSchema, UpdateNoticeSchema, Notice, NOTICE_CATEGORIES } from '@/lib/news-events'

// Simple toast utility
const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' | 'default' }) => {
  if (variant === 'destructive') {
    console.error(`${title}: ${description}`)
    alert(`Error: ${description}`)
  } else {
    console.log(`${title}: ${description}`)
  }
}

const NoticeEditorSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  category: z.string().min(1, 'Category is required'),
  deadline: z.string().optional(),
  body: z.string().min(1, 'Body is required'),
  attachments: z.array(z.string().url()).default([])
})

type NoticeEditorData = z.infer<typeof NoticeEditorSchema>

interface NoticeEditorProps {
  mode: 'create' | 'edit'
  notice?: Notice
}

export function NoticeEditor({ mode, notice }: NoticeEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState<string[]>(notice?.attachments || [])

  const form = useForm<NoticeEditorData>({
    resolver: zodResolver(NoticeEditorSchema),
    defaultValues: {
      title: notice?.title || '',
      category: notice?.category || '',
      deadline: notice?.deadline ? new Date(notice.deadline).toISOString().slice(0, 16) : '',
      body: notice?.body || '',
      attachments: notice?.attachments || []
    }
  })

  // Update form when attachments change
  useEffect(() => {
    form.setValue('attachments', uploadedAttachments)
  }, [uploadedAttachments, form])

  const onSubmit = async (data: NoticeEditorData) => {
    setIsLoading(true)
    try {
      const payload = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        attachments: uploadedAttachments
      }

      const url = mode === 'create' ? '/api/admin/notices' : `/api/admin/notices/${notice?.id}`
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
          title: mode === 'create' ? 'Notice created' : 'Notice updated',
          description: `Notice has been ${mode === 'create' ? 'created' : 'updated'} successfully.`,
        })
        router.push('/admin/notices')
      } else {
        throw new Error(result.error || 'Failed to save notice')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notice',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeAttachment = (index: number) => {
    setUploadedAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const getFileNameFromUrl = (url: string) => {
    try {
      return decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Document')
    } catch {
      return 'Document'
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
              <CardTitle>Notice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Enter notice title..."
                  className="mt-1"
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={form.watch('category')} onValueChange={(value) => form.setValue('category', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICE_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  {...form.register('deadline')}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Set a deadline for responses or compliance
                </p>
                {form.formState.errors.deadline && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.deadline.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="body">Notice Content *</Label>
                <Textarea
                  id="body"
                  {...form.register('body')}
                  placeholder="Enter the full notice content..."
                  className="mt-1"
                  rows={12}
                />
                {form.formState.errors.body && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.body.message}</p>
                )}
              </div>
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
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Create' : 'Update'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaUpload
                accept={{ 
                  'application/pdf': ['.pdf'],
                  'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
                  'text/plain': ['.txt'],
                  'application/msword': ['.doc'],
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
                }}
                maxFiles={10}
                onUploadComplete={(files) => {
                  const newUrls = files.map(f => f.publicUrl)
                  setUploadedAttachments(prev => [...prev, ...newUrls])
                }}
              />
              
              {/* Current Attachments */}
              {uploadedAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                  {uploadedAttachments.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700 truncate">
                          {getFileNameFromUrl(url)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Info */}
          {form.watch('deadline') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Deadline Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Deadline:</strong> {form.watch('deadline') && new Date(form.watch('deadline')!).toLocaleString()}
                  </p>
                  <div className="text-sm">
                    {form.watch('deadline') && new Date(form.watch('deadline')!) > new Date() ? (
                      <Badge variant="outline" className="text-green-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Expired
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </form>
  )
}
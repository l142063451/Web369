/**
 * Event Editor Component
 * PR12 - News/Notices/Events - Editor for creating and editing events
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Save, Calendar, MapPin, Users, FileText, Clock, Loader2, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MediaUpload } from '@/components/admin/content/MediaUpload'
import { CreateEventSchema, UpdateEventSchema, Event } from '@/lib/news-events'

// Simple toast utility
const toast = ({ title, description, variant }: { title: string; description: string; variant?: 'destructive' | 'default' }) => {
  if (variant === 'destructive') {
    console.error(`${title}: ${description}`)
    alert(`Error: ${description}`)
  } else {
    console.log(`${title}: ${description}`)
  }
}

const EventEditorSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  start: z.string().min(1, 'Start date is required'),
  end: z.string().min(1, 'End date is required'),
  location: z.string().max(200, 'Location too long').optional(),
  rsvpEnabled: z.boolean().default(false),
  description: z.string().max(2000, 'Description too long').optional(),
  attachments: z.array(z.string().url()).default([])
}).refine((data) => new Date(data.end) > new Date(data.start), {
  message: 'End date must be after start date',
  path: ['end']
})

type EventEditorData = z.infer<typeof EventEditorSchema>

interface EventEditorProps {
  mode: 'create' | 'edit'
  event?: Event
}

export function EventEditor({ mode, event }: EventEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedAttachments, setUploadedAttachments] = useState<string[]>(event?.attachments || [])

  const form = useForm<EventEditorData>({
    resolver: zodResolver(EventEditorSchema),
    defaultValues: {
      title: event?.title || '',
      start: event?.start ? new Date(event.start).toISOString().slice(0, 16) : '',
      end: event?.end ? new Date(event.end).toISOString().slice(0, 16) : '',
      location: event?.location || '',
      rsvpEnabled: event?.rsvpEnabled || false,
      description: event?.description || '',
      attachments: event?.attachments || []
    }
  })

  // Update form when attachments change
  useEffect(() => {
    form.setValue('attachments', uploadedAttachments)
  }, [uploadedAttachments, form])

  const onSubmit = async (data: EventEditorData) => {
    setIsLoading(true)
    try {
      const payload = {
        ...data,
        start: new Date(data.start),
        end: new Date(data.end),
        location: data.location || undefined,
        description: data.description || undefined,
        attachments: uploadedAttachments
      }

      const url = mode === 'create' ? '/api/admin/events' : `/api/admin/events/${event?.id}`
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
          title: mode === 'create' ? 'Event created' : 'Event updated',
          description: `Event has been ${mode === 'create' ? 'created' : 'updated'} successfully.`,
        })
        router.push('/admin/events')
      } else {
        throw new Error(result.error || 'Failed to save event')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save event',
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

  const generateICSFile = () => {
    if (!form.watch('title') || !form.watch('start') || !form.watch('end')) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in title, start, and end date to generate calendar file',
        variant: 'destructive'
      })
      return
    }

    const startDate = new Date(form.watch('start'))
    const endDate = new Date(form.watch('end'))
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ummid Se Hari//Event//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@ummidsehari.com`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${form.watch('title')}`,
      form.watch('description') ? `DESCRIPTION:${form.watch('description')?.replace(/\n/g, '\\n') || ''}` : '',
      form.watch('location') ? `LOCATION:${form.watch('location')}` : '',
      `CREATED:${formatICSDate(new Date())}`,
      `LAST-MODIFIED:${formatICSDate(new Date())}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n')

    // Create and download the file
    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.watch('title').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Calendar File Generated',
      description: 'ICS file has been downloaded. Import it into your calendar app.',
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Enter event title..."
                  className="mt-1"
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Start Date & Time *</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    {...form.register('start')}
                    className="mt-1"
                  />
                  {form.formState.errors.start && (
                    <p className="mt-1 text-sm text-red-600">{form.formState.errors.start.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="end">End Date & Time *</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    {...form.register('end')}
                    className="mt-1"
                  />
                  {form.formState.errors.end && (
                    <p className="mt-1 text-sm text-red-600">{form.formState.errors.end.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  {...form.register('location')}
                  placeholder="Event venue or address..."
                  className="mt-1"
                />
                {form.formState.errors.location && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.location.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Describe the event, agenda, requirements..."
                  className="mt-1"
                  rows={8}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {form.watch('description')?.length || 0}/2000 characters
                </p>
                {form.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>
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
              
              {/* ICS Export */}
              <Button
                type="button"
                variant="outline"
                onClick={generateICSFile}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Calendar
              </Button>
            </CardContent>
          </Card>

          {/* RSVP Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                RSVP Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="rsvpEnabled">Enable RSVP</Label>
                  <p className="text-sm text-gray-500">Allow people to register for this event</p>
                </div>
                <Checkbox
                  id="rsvpEnabled"
                  checked={form.watch('rsvpEnabled')}
                  onCheckedChange={(checked) => form.setValue('rsvpEnabled', !!checked)}
                />
              </div>
              
              {form.watch('rsvpEnabled') && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-700">
                    RSVP form will be automatically generated and linked to this event.
                    You can manage RSVPs from the events dashboard.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Event Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaUpload
                accept={{ 
                  'application/pdf': ['.pdf'],
                  'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
                  'text/plain': ['.txt'],
                  'application/msword': ['.doc'],
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                  'application/vnd.ms-powerpoint': ['.ppt'],
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
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

          {/* Event Preview */}
          {form.watch('start') && form.watch('end') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Event Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Duration:</strong> {
                      Math.ceil((new Date(form.watch('end')).getTime() - new Date(form.watch('start')).getTime()) / (1000 * 60 * 60 * 24))
                    } day{Math.ceil((new Date(form.watch('end')).getTime() - new Date(form.watch('start')).getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
                  </p>
                  <div className="text-sm">
                    {new Date(form.watch('start')) > new Date() ? (
                      <Badge variant="secondary" className="text-blue-600">
                        Upcoming Event
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Past Event
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
/**
 * Template Preview Component
 * Real-time preview of notification templates with variable substitution
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Eye, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Bell,
  RefreshCw 
} from 'lucide-react'
import { previewTemplate } from '@/lib/notifications/template-engine'

interface TemplatePreviewProps {
  templateId?: string
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEB_PUSH'
  variables?: Record<string, any>
}

// Mock templates for preview
const MOCK_TEMPLATES: Record<string, any> = {
  'welcome-email': {
    id: 'welcome-email',
    channel: 'EMAIL',
    subject: 'Welcome to {{app.name}}!',
    content: `Hello {{user.name}},

Welcome to {{app.name}}! We're excited to have you as part of our community.

Your account has been successfully created and you can now:
- Submit service requests
- Track project updates  
- Participate in community initiatives
- Stay updated with local news and events

{{#if user.email}}
You'll receive important updates at {{user.email}}.
{{/if}}

Visit us at {{app.url}} to get started.

Best regards,
The {{app.name}} Team`
  },
  'form-submitted-sms': {
    id: 'form-submitted-sms',
    channel: 'SMS',
    content: 'Your form has been submitted successfully. Reference ID: {{reference.id}}. Track status at {{app.url}}'
  },
  'event-reminder': {
    id: 'event-reminder',
    channel: 'EMAIL',
    subject: 'Reminder: {{event.title}}',
    content: `Hi {{user.name}},

This is a friendly reminder about the upcoming event:

📅 Event: {{event.title}}
📍 Location: {{event.location}}
🗓️ Date: {{event.date}}
🕐 Time: {{event.time}}

{{#if event.description}}
{{event.description}}
{{/if}}

We look forward to seeing you there!

RSVP at {{app.url}}/events/{{event.id}}`
  },
  'payment-confirmation': {
    id: 'payment-confirmation',
    channel: 'SMS',
    content: 'Payment of ₹{{payment.amount}} received for {{service.name}}. Receipt: {{payment.id}}. Thank you!'
  }
}

export function TemplatePreview({ templateId, channel, variables = {} }: TemplatePreviewProps) {
  const [preview, setPreview] = useState<string>('')
  const [subjectPreview, setSubjectPreview] = useState<string>('')
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const template = templateId ? MOCK_TEMPLATES[templateId] : null

  // Update preview when template or variables change
  useEffect(() => {
    if (template) {
      generatePreview()
    }
  }, [template, variables, customVariables])

  const generatePreview = () => {
    if (!template) return

    try {
      setLoading(true)

      // Combine variables with custom variables
      const allVariables = {
        ...variables,
        ...customVariables,
        // Default sample data
        user: {
          name: variables['user.name'] || customVariables['user.name'] || 'John Doe',
          email: 'john.doe@example.com',
          phone: '+91 9876543210',
          ...variables
        },
        app: {
          name: 'Ummid Se Hari',
          url: 'https://ummid-se-hari.com',
          version: '1.0.0'
        },
        date: {
          now: new Date().toLocaleString('en-IN'),
          formatted: new Date().toLocaleDateString('en-IN')
        },
        reference: {
          id: customVariables['reference.id'] || 'REF123456'
        },
        event: {
          title: 'Community Health Checkup',
          location: 'Primary Health Center',
          date: '2024-02-15',
          time: '10:00 AM',
          description: 'Free health checkup for all community members.',
          id: 'event-123'
        },
        payment: {
          amount: '500',
          id: 'PAY123456'
        },
        service: {
          name: 'Birth Certificate'
        }
      }

      // Generate preview using template engine
      const contentPreview = previewTemplate(template.content, allVariables)
      setPreview(contentPreview)

      // Generate subject preview for email
      if (template.subject) {
        const subjectPreview = previewTemplate(template.subject, allVariables)
        setSubjectPreview(subjectPreview)
      }

    } catch (error) {
      console.error('Preview generation failed:', error)
      setPreview('Error generating preview. Please check your template syntax.')
    } finally {
      setLoading(false)
    }
  }

  const getChannelIcon = () => {
    switch (channel || template?.channel) {
      case 'EMAIL':
        return <Mail className="h-5 w-5" />
      case 'SMS':
        return <Smartphone className="h-5 w-5" />
      case 'WHATSAPP':
        return <MessageSquare className="h-5 w-5" />
      case 'WEB_PUSH':
        return <Bell className="h-5 w-5" />
      default:
        return <Eye className="h-5 w-5" />
    }
  }

  const getChannelName = () => {
    switch (channel || template?.channel) {
      case 'EMAIL':
        return 'Email'
      case 'SMS':
        return 'SMS'
      case 'WHATSAPP':
        return 'WhatsApp'
      case 'WEB_PUSH':
        return 'Web Push'
      default:
        return 'Preview'
    }
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No Template Selected</p>
            <p className="text-muted-foreground">Select a template to see the preview</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Variable Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Preview Variables</CardTitle>
          <CardDescription>
            Customize variables to see how they appear in the preview
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="var-user-name">User Name</Label>
              <Input
                id="var-user-name"
                value={customVariables['user.name'] || ''}
                onChange={(e) => setCustomVariables(prev => ({
                  ...prev,
                  'user.name': e.target.value
                }))}
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <Label htmlFor="var-reference">Reference ID</Label>
              <Input
                id="var-reference"
                value={customVariables['reference.id'] || ''}
                onChange={(e) => setCustomVariables(prev => ({
                  ...prev,
                  'reference.id': e.target.value
                }))}
                placeholder="e.g., REF123456"
              />
            </div>
          </div>
          <Button onClick={generatePreview} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Preview
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {getChannelIcon()}
            <span className="ml-2">{getChannelName()} Preview</span>
            <Badge variant="outline" className="ml-auto">
              {template.channel}
            </Badge>
          </CardTitle>
          <CardDescription>
            Live preview of how your notification will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Generating preview...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email Preview */}
              {template.channel === 'EMAIL' && (
                <div className="border rounded-lg p-4 bg-white">
                  <div className="border-b pb-3 mb-3">
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <span className="font-medium">From:</span>
                      <span className="ml-2">Ummid Se Hari &lt;noreply@ummid-se-hari.com&gt;</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <span className="font-medium">To:</span>
                      <span className="ml-2">{customVariables['user.name'] || variables['user.name'] || 'John Doe'} &lt;john.doe@example.com&gt;</span>
                    </div>
                    {subjectPreview && (
                      <div className="flex items-center text-sm">
                        <span className="font-medium">Subject:</span>
                        <span className="ml-2 font-semibold">{subjectPreview}</span>
                      </div>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {preview}
                  </div>
                </div>
              )}

              {/* SMS Preview */}
              {template.channel === 'SMS' && (
                <div className="max-w-sm mx-auto">
                  <div className="bg-blue-500 text-white p-3 rounded-lg rounded-bl-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {preview}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    SMS • {preview.length} characters
                  </div>
                </div>
              )}

              {/* WhatsApp Preview */}
              {template.channel === 'WHATSAPP' && (
                <div className="max-w-sm mx-auto">
                  <div className="bg-green-500 text-white p-3 rounded-lg rounded-bl-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {preview}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    WhatsApp • Delivered
                  </div>
                </div>
              )}

              {/* Web Push Preview */}
              {template.channel === 'WEB_PUSH' && (
                <div className="max-w-sm mx-auto">
                  <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg">
                    <div className="flex items-start space-x-3">
                      <img 
                        src="/icons/icon-192.png" 
                        alt="App Icon"
                        className="w-8 h-8 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm mb-1">
                          {subjectPreview || 'Ummid Se Hari'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {preview}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-center">
                    Web Push Notification
                  </div>
                </div>
              )}

              {/* Character Count */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Preview length: {preview.length} characters
                {template.channel === 'SMS' && preview.length > 160 && (
                  <span className="text-yellow-600 ml-2">
                    (Multiple SMS segments)
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
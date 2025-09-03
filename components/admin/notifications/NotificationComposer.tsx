/**
 * Notification Composer Component
 * Advanced interface for creating and sending notifications
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  AlertTriangle, 
  Send, 
  Users, 
  Eye, 
  Calendar, 
  TestTube,
  Sparkles
} from 'lucide-react'
import { AudienceBuilder } from './AudienceBuilder'
import { TemplatePreview } from './TemplatePreview'
import { TestSender } from './TestSender'

interface NotificationComposerProps {
  onSuccess?: () => void
}

interface NotificationRequest {
  templateId: string
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEB_PUSH'
  audience: {
    type: 'ALL' | 'ROLE' | 'CUSTOM'
    criteria: any
  }
  variables: Record<string, any>
  scheduledAt?: Date
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

const TEMPLATES = [
  { id: 'welcome-email', name: 'Welcome Email', channel: 'EMAIL' },
  { id: 'form-submitted-sms', name: 'Form Submitted SMS', channel: 'SMS' },
  { id: 'event-reminder', name: 'Event Reminder', channel: 'EMAIL' },
  { id: 'payment-confirmation', name: 'Payment Confirmation', channel: 'SMS' }
]

export function NotificationComposer({ onSuccess }: NotificationComposerProps) {
  const [formData, setFormData] = useState<Partial<NotificationRequest>>({
    channel: 'EMAIL',
    audience: {
      type: 'ALL',
      criteria: {}
    },
    variables: {},
    priority: 'NORMAL'
  })

  const [loading, setLoading] = useState(false)
  const [estimatedAudience, setEstimatedAudience] = useState(0)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [activeTab, setActiveTab] = useState('compose')

  // Estimate audience size when audience changes
  useEffect(() => {
    if (formData.audience) {
      estimateAudienceSize()
    }
  }, [formData.audience])

  const estimateAudienceSize = async () => {
    try {
      const response = await fetch('/api/notifications/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.audience)
      })

      const data = await response.json()
      if (data.success) {
        setEstimatedAudience(data.estimatedSize)
      }
    } catch (error) {
      console.error('Failed to estimate audience size:', error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.templateId || !formData.channel) {
      alert('Please select a template and channel')
      return
    }

    try {
      setLoading(true)

      const requestData: NotificationRequest = {
        templateId: formData.templateId,
        channel: formData.channel,
        audience: formData.audience!,
        variables: formData.variables || {},
        priority: formData.priority || 'NORMAL'
      }

      // Add scheduled date if enabled
      if (isScheduled && scheduledDate && scheduledTime) {
        requestData.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        alert(`Notification ${isScheduled ? 'scheduled' : 'sent'} successfully!`)
        onSuccess?.()
      } else {
        alert(`Failed to send notification: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
      alert('Failed to send notification. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="audience" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Audience ({estimatedAudience})
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Composition</CardTitle>
              <CardDescription>
                Select template, channel, and configure your notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Channel Selection */}
              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(value: any) => 
                    setFormData(prev => ({ ...prev, channel: value, templateId: '' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">📧 Email</SelectItem>
                    <SelectItem value="SMS">📱 SMS</SelectItem>
                    <SelectItem value="WHATSAPP">📞 WhatsApp</SelectItem>
                    <SelectItem value="WEB_PUSH">🔔 Web Push</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select
                  value={formData.templateId}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, templateId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification template" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES
                      .filter(t => !formData.channel || t.channel === formData.channel)
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                          <Badge variant="outline" className="ml-2">
                            {template.channel}
                          </Badge>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variables */}
              <div className="space-y-2">
                <Label>Template Variables</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="var-name" className="text-sm">user.name</Label>
                    <Input
                      id="var-name"
                      placeholder="e.g., John Doe"
                      value={formData.variables?.['user.name'] || ''}
                      onChange={(e) => 
                        setFormData(prev => ({
                          ...prev,
                          variables: { ...prev.variables, 'user.name': e.target.value }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="var-custom" className="text-sm">reference.id</Label>
                    <Input
                      id="var-custom"
                      placeholder="e.g., REF123456"
                      value={formData.variables?.['reference.id'] || ''}
                      onChange={(e) => 
                        setFormData(prev => ({
                          ...prev,
                          variables: { ...prev.variables, 'reference.id': e.target.value }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">🔵 Low</SelectItem>
                    <SelectItem value="NORMAL">⚪ Normal</SelectItem>
                    <SelectItem value="HIGH">🟡 High</SelectItem>
                    <SelectItem value="URGENT">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduling */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="schedule"
                    checked={isScheduled}
                    onCheckedChange={setIsScheduled}
                  />
                  <Label htmlFor="schedule">Schedule for later</Label>
                </div>

                {isScheduled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience">
          <AudienceBuilder
            audience={formData.audience!}
            onAudienceChange={(audience) =>
              setFormData(prev => ({ ...prev, audience }))
            }
          />
        </TabsContent>

        <TabsContent value="preview">
          <TemplatePreview
            templateId={formData.templateId}
            channel={formData.channel}
            variables={formData.variables}
          />
        </TabsContent>

        <TabsContent value="test">
          <TestSender
            templateId={formData.templateId}
            channel={formData.channel}
            variables={formData.variables}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex items-center text-sm text-muted-foreground">
          {estimatedAudience > 0 && (
            <>
              <Users className="h-4 w-4 mr-2" />
              {estimatedAudience} recipients
            </>
          )}
          {isScheduled && scheduledDate && scheduledTime && (
            <>
              <Calendar className="h-4 w-4 ml-4 mr-2" />
              Scheduled for {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
            </>
          )}
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setActiveTab('test')}>
            <TestTube className="h-4 w-4 mr-2" />
            Test Send
          </Button>
          
          <Button onClick={handleSubmit} disabled={loading || !formData.templateId}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isScheduled ? 'Schedule' : 'Send'} Notification
          </Button>
        </div>
      </div>
    </div>
  )
}
/**
 * Notification Templates Component
 * Template management interface (placeholder for future implementation)
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, FileText } from 'lucide-react'

// Mock templates for now
const MOCK_TEMPLATES = [
  {
    id: 'welcome-email',
    name: 'Welcome Email',
    channel: 'EMAIL',
    active: true,
    variables: ['user.name', 'app.name', 'app.url'],
    createdAt: '2024-01-15T10:00:00Z',
    description: 'Welcome new users to the platform'
  },
  {
    id: 'form-submitted-sms',
    name: 'Form Submitted SMS',
    channel: 'SMS',
    active: true,
    variables: ['reference.id', 'app.url'],
    createdAt: '2024-01-15T11:00:00Z',
    description: 'Confirmation SMS for form submissions'
  },
  {
    id: 'event-reminder',
    name: 'Event Reminder',
    channel: 'EMAIL',
    active: true,
    variables: ['user.name', 'event.title', 'event.date', 'event.location'],
    createdAt: '2024-01-15T12:00:00Z',
    description: 'Reminder for upcoming events'
  },
  {
    id: 'payment-confirmation',
    name: 'Payment Confirmation',
    channel: 'SMS',
    active: false,
    variables: ['payment.amount', 'service.name', 'payment.id'],
    createdAt: '2024-01-15T13:00:00Z',
    description: 'Payment receipt notification'
  }
]

export function NotificationTemplates() {
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return 'bg-blue-100 text-blue-800'
      case 'SMS':
        return 'bg-green-100 text-green-800'
      case 'WHATSAPP':
        return 'bg-emerald-100 text-emerald-800'
      case 'WEB_PUSH':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Notification Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage reusable notification templates
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {MOCK_TEMPLATES.map((template) => (
          <Card key={template.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge 
                        variant="secondary" 
                        className={getChannelColor(template.channel)}
                      >
                        {template.channel}
                      </Badge>
                      <Badge variant={template.active ? "default" : "secondary"}>
                        {template.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{template.variables.length} variables</span>
                      <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-semibold mb-2">Advanced Template Editor Coming Soon</h4>
          <p className="text-sm text-muted-foreground">
            A rich template editor with visual builder, variable management, and preview functionality 
            will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
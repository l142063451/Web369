/**
 * Test Sender Component
 * Interface for sending test notifications to specific recipients
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TestTube, 
  Send, 
  CheckCircle, 
  XCircle, 
  Mail,
  Smartphone,
  MessageSquare,
  Bell,
  AlertTriangle
} from 'lucide-react'

interface TestSenderProps {
  templateId?: string
  channel?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEB_PUSH'
  variables?: Record<string, any>
}

interface TestResult {
  success: boolean
  messageId?: string
  error?: string
  deliveredAt?: string
}

export function TestSender({ templateId, channel, variables = {} }: TestSenderProps) {
  const [recipient, setRecipient] = useState({
    email: '',
    phone: '',
    id: ''
  })
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const getChannelIcon = () => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="h-4 w-4" />
      case 'SMS':
        return <Smartphone className="h-4 w-4" />
      case 'WHATSAPP':
        return <MessageSquare className="h-4 w-4" />
      case 'WEB_PUSH':
        return <Bell className="h-4 w-4" />
      default:
        return <TestTube className="h-4 w-4" />
    }
  }

  const getRequiredField = () => {
    switch (channel) {
      case 'EMAIL':
        return 'email'
      case 'SMS':
      case 'WHATSAPP':
        return 'phone'
      case 'WEB_PUSH':
        return 'id'
      default:
        return 'email'
    }
  }

  const getFieldPlaceholder = () => {
    switch (channel) {
      case 'EMAIL':
        return 'test@example.com'
      case 'SMS':
      case 'WHATSAPP':
        return '+91 9876543210'
      case 'WEB_PUSH':
        return 'user-id'
      default:
        return 'recipient'
    }
  }

  const validateRecipient = (): string | null => {
    const requiredField = getRequiredField()
    const value = recipient[requiredField as keyof typeof recipient]

    if (!value) {
      return `${requiredField.charAt(0).toUpperCase() + requiredField.slice(1)} is required`
    }

    if (requiredField === 'email' && !value.includes('@')) {
      return 'Invalid email address'
    }

    if (requiredField === 'phone' && !/^\+?[\d\s\-\(\)]+$/.test(value)) {
      return 'Invalid phone number format'
    }

    return null
  }

  const handleSendTest = async () => {
    if (!templateId || !channel) {
      alert('Please select a template and channel first')
      return
    }

    const validationError = validateRecipient()
    if (validationError) {
      alert(validationError)
      return
    }

    try {
      setLoading(true)
      setResult(null)

      // Combine variables
      const allVariables = {
        ...variables,
        ...customVariables
      }

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          channel,
          recipient,
          variables: allVariables
        })
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to send test notification'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!templateId || !channel) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No Template Selected</p>
            <p className="text-muted-foreground">Select a template and channel to send test notifications</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TestTube className="h-5 w-5 mr-2" />
            Test Notification
          </CardTitle>
          <CardDescription>
            Send a test notification to verify your template and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              {getChannelIcon()}
              <div>
                <p className="font-medium">{templateId}</p>
                <p className="text-sm text-muted-foreground">Template ID</p>
              </div>
            </div>
            <Badge variant="secondary">{channel}</Badge>
          </div>

          {/* Recipient Input */}
          <div className="space-y-2">
            <Label htmlFor="recipient">
              Recipient {channel === 'EMAIL' ? 'Email' : channel === 'WEB_PUSH' ? 'User ID' : 'Phone Number'}
            </Label>
            <Input
              id="recipient"
              type={channel === 'EMAIL' ? 'email' : 'text'}
              value={recipient[getRequiredField() as keyof typeof recipient]}
              onChange={(e) => setRecipient(prev => ({
                ...prev,
                [getRequiredField()]: e.target.value
              }))}
              placeholder={getFieldPlaceholder()}
            />
            <p className="text-xs text-muted-foreground">
              {channel === 'EMAIL' && 'Enter a valid email address to receive the test notification'}
              {(channel === 'SMS' || channel === 'WHATSAPP') && 'Enter a phone number with country code (e.g., +91 9876543210)'}
              {channel === 'WEB_PUSH' && 'Enter a user ID (for testing, any string will work)'}
            </p>
          </div>

          {/* Custom Variables */}
          <div className="space-y-4">
            <Label>Test Variables</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="test-var-name" className="text-sm">user.name</Label>
                <Input
                  id="test-var-name"
                  value={customVariables['user.name'] || ''}
                  onChange={(e) => setCustomVariables(prev => ({
                    ...prev,
                    'user.name': e.target.value
                  }))}
                  placeholder="Test User"
                />
              </div>
              <div>
                <Label htmlFor="test-var-ref" className="text-sm">reference.id</Label>
                <Input
                  id="test-var-ref"
                  value={customVariables['reference.id'] || ''}
                  onChange={(e) => setCustomVariables(prev => ({
                    ...prev,
                    'reference.id': e.target.value
                  }))}
                  placeholder="TEST123"
                />
              </div>
            </div>
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSendTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Test...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Notification
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Test notification sent successfully!</p>
                    {result.messageId && (
                      <p className="text-sm text-muted-foreground">
                        Message ID: <code className="bg-muted px-1 rounded">{result.messageId}</code>
                      </p>
                    )}
                    {result.deliveredAt && (
                      <p className="text-sm text-muted-foreground">
                        Delivered at: {new Date(result.deliveredAt).toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Check your {channel.toLowerCase()} for the test notification.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Test notification failed</p>
                    <p className="text-sm">{result.error}</p>
                    <p className="text-sm">
                      Please check your configuration and try again.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testing Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <Mail className="h-4 w-4 mt-0.5 text-blue-600" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-muted-foreground">
                  Use your own email address for testing. Check spam folder if not received.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Smartphone className="h-4 w-4 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">SMS</p>
                <p className="text-muted-foreground">
                  In development mode, SMS are simulated. Check server logs for the message content.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <MessageSquare className="h-4 w-4 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-muted-foreground">
                  WhatsApp messages require approved templates. Test messages are simulated in development.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Bell className="h-4 w-4 mt-0.5 text-purple-600" />
              <div>
                <p className="font-medium">Web Push</p>
                <p className="text-muted-foreground">
                  Web Push notifications require user subscription. Use any user ID for testing.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
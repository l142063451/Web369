/**
 * Notification History Component
 * Display historical notification data with detailed information
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  History, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  Download 
} from 'lucide-react'

interface NotificationHistoryProps {
  notifications: Array<{
    id: string
    channel: string
    templateId?: string
    status: string
    payload: any
    stats: any
    scheduledAt?: string
    sentAt?: string
    createdAt: string
  }>
  loading: boolean
}

export function NotificationHistory({ notifications, loading }: NotificationHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'SCHEDULED':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

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

  const handleExport = () => {
    // Implement CSV export functionality
    console.log('Exporting notification history...')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Notification History
            </CardTitle>
            <CardDescription>
              Complete history of all sent notifications
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading history...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No notification history</p>
            <p className="text-muted-foreground">Sent notifications will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="border rounded-lg p-4 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(notification.status)}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="secondary" className={getChannelColor(notification.channel)}>
                          {notification.channel}
                        </Badge>
                        <span className="font-medium">
                          {notification.templateId || 'Custom Message'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.sentAt 
                          ? `Sent ${new Date(notification.sentAt).toLocaleString()}`
                          : notification.scheduledAt
                          ? `Scheduled for ${new Date(notification.scheduledAt).toLocaleString()}`
                          : `Created ${new Date(notification.createdAt).toLocaleString()}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right text-sm">
                      {notification.stats && (
                        <div className="text-muted-foreground">
                          <div>{notification.stats.sent || 0} sent</div>
                          {notification.stats.failed > 0 && (
                            <div className="text-red-600">
                              {notification.stats.failed} failed
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Additional details when expanded */}
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>ID: {notification.id}</span>
                    <span>Status: {notification.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
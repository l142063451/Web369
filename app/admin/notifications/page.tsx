/**
 * Notifications Admin Page
 * Comprehensive notification management interface
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Plus, Send, Users, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { NotificationComposer } from '@/components/admin/notifications/NotificationComposer'
import { NotificationHistory } from '@/components/admin/notifications/NotificationHistory'
import { NotificationStats } from '@/components/admin/notifications/NotificationStats'
import { NotificationTemplates } from '@/components/admin/notifications/NotificationTemplates'

interface Notification {
  id: string
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEB_PUSH'
  templateId?: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'SCHEDULED'
  payload: any
  stats: any
  scheduledAt?: string
  sentAt?: string
  createdAt: string
}

interface NotificationStats {
  total: number
  sent: number
  failed: number
  scheduled: number
  byChannel: Record<string, number>
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'send' | 'templates' | 'history'>('overview')
  const [filters, setFilters] = useState({
    channel: '',
    status: '',
    search: ''
  })

  // Fetch notifications and stats
  useEffect(() => {
    fetchNotifications()
    fetchStats()
  }, [filters])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.channel) params.set('channel', filters.channel)
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`/api/notifications?${params}`)
      const data = await response.json()
      
      if (data.notifications) {
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // This would be a separate stats endpoint
      setStats({
        total: 156,
        sent: 142,
        failed: 8,
        scheduled: 6,
        byChannel: {
          EMAIL: 89,
          SMS: 34,
          WHATSAPP: 21,
          WEB_PUSH: 12
        }
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications Center</h1>
          <p className="text-muted-foreground">
            Manage and send notifications across all channels
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send New Notification</DialogTitle>
              <DialogDescription>
                Create and send notifications to your audience across multiple channels
              </DialogDescription>
            </DialogHeader>
            <NotificationComposer onSuccess={() => {
              fetchNotifications()
              fetchStats()
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Users },
          { id: 'send', label: 'Send Notification', icon: Send },
          { id: 'templates', label: 'Templates', icon: Plus },
          { id: 'history', label: 'History', icon: Clock }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && <NotificationStats stats={stats} />}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>Filter and view notification history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Select value={filters.channel} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, channel: value }))
                }>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Channels</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="WEB_PUSH">Web Push</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.status} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Search notifications..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="flex-1"
                />
              </div>

              {/* Notifications List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold">No notifications found</p>
                    <p className="text-muted-foreground">Try adjusting your filters or send your first notification.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(notification.status)}
                        <div>
                          <div className="flex items-center space-x-2">
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
                      
                      <div className="text-right text-sm">
                        {notification.stats && (
                          <div className="text-muted-foreground">
                            {notification.stats.sent || 0} sent
                            {notification.stats.failed > 0 && (
                              <span className="text-red-600 ml-2">
                                {notification.stats.failed} failed
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'send' && (
        <NotificationComposer onSuccess={() => {
          fetchNotifications()
          fetchStats()
          setActiveTab('overview')
        }} />
      )}

      {activeTab === 'templates' && (
        <NotificationTemplates />
      )}

      {activeTab === 'history' && (
        <NotificationHistory notifications={notifications} loading={loading} />
      )}
    </div>
  )
}
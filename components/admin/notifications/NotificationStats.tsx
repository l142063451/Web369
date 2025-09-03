/**
 * Notification Statistics Component
 * Display comprehensive notification analytics and metrics
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  Mail,
  MessageSquare,
  Smartphone,
  Bell
} from 'lucide-react'

interface NotificationStatsProps {
  stats: {
    total: number
    sent: number
    failed: number
    scheduled: number
    byChannel: Record<string, number>
  }
}

export function NotificationStats({ stats }: NotificationStatsProps) {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="h-5 w-5" />
      case 'SMS':
        return <Smartphone className="h-5 w-5" />
      case 'WHATSAPP':
        return <MessageSquare className="h-5 w-5" />
      case 'WEB_PUSH':
        return <Bell className="h-5 w-5" />
      default:
        return <Send className="h-5 w-5" />
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return 'text-blue-600 bg-blue-50'
      case 'SMS':
        return 'text-green-600 bg-green-50'
      case 'WHATSAPP':
        return 'text-emerald-600 bg-emerald-50'
      case 'WEB_PUSH':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Notifications */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center">
              <Send className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <Badge variant="secondary" className="text-xs">
              All Time
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
            </div>
            <div className="h-8 w-8 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <Progress value={successRate} className="h-1" />
          </div>
        </CardContent>
      </Card>

      {/* Failed Notifications */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">{stats.failed.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-red-50 rounded-full flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className="text-red-600">
              {stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}% failure rate
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold">{stats.scheduled.toLocaleString()}</p>
            </div>
            <div className="h-8 w-8 bg-yellow-50 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <Badge variant="outline" className="text-xs">
              Pending
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Channel Breakdown */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Channel Distribution</CardTitle>
          <CardDescription>
            Breakdown of notifications by delivery channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.byChannel).map(([channel, count]) => {
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
              
              return (
                <div key={channel} className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${getChannelColor(channel)}`}>
                    {getChannelIcon(channel)}
                  </div>
                  <p className="text-lg font-semibold">{count.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{channel}</p>
                  <div className="mt-1">
                    <Progress value={percentage} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Image,
  FormInput,
  Inbox,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react'

interface AdminDashboardProps {
  userRoles: string[]
}

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

function StatCard({ title, value, description, icon: Icon, trend, trendValue }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center">
          {trendValue && (
            <span className={`mr-1 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

interface QuickActionProps {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
}

function QuickAction({ title, description, href, icon: Icon, variant = 'outline' }: QuickActionProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Icon className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant={variant} size="sm" className="w-full" asChild>
          <a href={href}>Get Started</a>
        </Button>
      </CardContent>
    </Card>
  )
}

export function AdminDashboard({ userRoles }: AdminDashboardProps) {
  const isAdmin = userRoles.includes('admin')
  const isEditor = userRoles.includes('editor')

  return (
    <div className="space-y-6">
      {/* Role-based welcome message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-900">Welcome back!</span>
          <div className="flex space-x-1">
            {userRoles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        </div>
        <p className="mt-2 text-sm text-green-800">
          Your administrative panel is ready. Start managing your village&apos;s digital presence.
        </p>
      </div>

      {/* Key Statistics */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={0}
            description="Registered citizens"
            icon={Users}
            trend="up"
            trendValue="+0%"
          />
          <StatCard
            title="Active Forms"
            value={0}
            description="Published forms"
            icon={FormInput}
            trend="neutral"
            trendValue="0 new"
          />
          <StatCard
            title="Pending Submissions"
            value={0}
            description="Awaiting review"
            icon={Inbox}
            trend="neutral"
            trendValue="0 today"
          />
          <StatCard
            title="Content Pages"
            value={0}
            description="Published pages"
            icon={FileText}
            trend="neutral"
            trendValue="0 drafts"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isAdmin || isEditor) && (
            <>
              <QuickAction
                title="Create Content"
                description="Add new pages and content"
                href="/admin/content/new"
                icon={FileText}
              />
              <QuickAction
                title="Upload Media"
                description="Add images and documents"
                href="/admin/media/upload"
                icon={Image}
              />
              <QuickAction
                title="Build Form"
                description="Create new forms"
                href="/admin/forms/new"
                icon={FormInput}
              />
            </>
          )}
          
          <QuickAction
            title="Review Submissions"
            description="Process citizen requests"
            href="/admin/submissions"
            icon={Inbox}
          />
          
          {isAdmin && (
            <>
              <QuickAction
                title="Manage Users"
                description="Add and manage users"
                href="/admin/users"
                icon={Users}
              />
              <QuickAction
                title="System Settings"
                description="Configure the system"
                href="/admin/settings"
                icon={Activity}
              />
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Feed</CardTitle>
            <CardDescription>Latest changes and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Activity will appear here as users interact with the system</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health Check</CardTitle>
            <CardDescription>Current system status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Authentication</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">File Storage</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
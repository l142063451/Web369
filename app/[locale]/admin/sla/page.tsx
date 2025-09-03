/**
 * Admin SLA Monitoring Dashboard
 * Monitor SLA performance and manage escalations
 * Part of PR07: Form Builder & SLA Engine
 */

import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  RefreshCw,
  Settings
} from 'lucide-react'
import Link from 'next/link'

// Mock SLA data for demonstration
const mockSlaMetrics = {
  total: 156,
  resolved: 134,
  overdue: 8,
  onTime: 126,
  complianceRate: 94.87,
  resolutionRate: 85.9,
  escalatedCount: 12,
  escalationRate: 7.7,
  avgResolutionHours: 72.5
}

const mockOverdueSubmissions = [
  {
    id: '1',
    formName: 'Complaint Registration Form',
    submitterName: 'Rajesh Kumar',
    status: 'ESCALATED',
    createdAt: '2024-08-15T10:30:00Z',
    slaDue: '2024-08-29T17:00:00Z',
    hoursOverdue: 168,
    priority: 'critical' as const
  },
  {
    id: '2',
    formName: 'RTI Request Form', 
    submitterName: 'Priya Sharma',
    status: 'PENDING',
    createdAt: '2024-08-20T14:15:00Z',
    slaDue: '2024-09-01T17:00:00Z',
    hoursOverdue: 72,
    priority: 'high' as const
  },
  {
    id: '3',
    formName: 'Water Supply Complaint',
    submitterName: 'Anonymous',
    status: 'IN_PROGRESS',
    createdAt: '2024-08-25T09:45:00Z',
    slaDue: '2024-09-02T17:00:00Z',
    hoursOverdue: 24,
    priority: 'medium' as const
  }
]

function SlaMetricsCards() {
  const metrics = [
    {
      title: 'SLA Compliance',
      value: `${mockSlaMetrics.complianceRate}%`,
      change: '+2.3% vs last month',
      changeType: 'positive' as const,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Resolution Rate',
      value: `${mockSlaMetrics.resolutionRate}%`,
      change: '±0.5% vs last month',
      changeType: 'neutral' as const,
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      title: 'Overdue Items',
      value: mockSlaMetrics.overdue.toString(),
      change: '+3 since yesterday',
      changeType: 'negative' as const,
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      title: 'Avg Resolution Time',
      value: `${Math.round(mockSlaMetrics.avgResolutionHours)}h`,
      change: '-8h vs last week',
      changeType: 'positive' as const,
      icon: Clock,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className={`text-xs ${
                metric.changeType === 'positive' ? 'text-green-600' : 
                metric.changeType === 'negative' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {metric.change}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function OverdueSubmissionsTable({ submissions }: { submissions: typeof mockOverdueSubmissions }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'  
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submission</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Hours Overdue</TableHead>
            <TableHead>SLA Due</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{submission.submitterName}</div>
                  <div className="text-xs text-gray-400">ID: {submission.id}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-sm">{submission.formName}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {submission.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getPriorityColor(submission.priority)}>
                  {submission.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="font-medium text-red-600">
                  {submission.hoursOverdue}h
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{formatDate(submission.slaDue)}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Escalate
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/forms/submissions/${submission.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SlaPerformanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Performance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Complaints</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">89%</span>
              <Progress value={89} className="w-24" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">RTI Requests</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">96%</span>
              <Progress value={96} className="w-24" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Suggestions</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">78%</span>
              <Progress value={78} className="w-24" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">General Forms</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">92%</span>
              <Progress value={92} className="w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WorkerStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          SLA Worker Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Running
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Queue Length</span>
            <span className="text-sm font-medium">5 jobs</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Last Check</span>
            <span className="text-sm font-medium">2 min ago</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Uptime</span>
            <span className="text-sm font-medium">2d 14h 32m</span>
          </div>
          <div className="pt-3 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Play className="h-4 w-4 mr-1" />
                Run Check
              </Button>
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AdminSlaPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if user has permission to view SLA metrics
  const hasPermission = await checkPermission(session.user.id, 'sla', 'read')
  if (!hasPermission) {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SLA Monitoring</h1>
          <p className="text-gray-600">
            Monitor service level agreements and manage escalations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="7d">
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <SlaMetricsCards />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <SlaPerformanceChart />
          
          {/* Overdue Submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Overdue Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading overdue submissions...</div>}>
                <OverdueSubmissionsTable submissions={mockOverdueSubmissions} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Status */}
        <div className="space-y-6">
          <WorkerStatus />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full" variant="outline">
                  Process All Escalations
                </Button>
                <Button className="w-full" variant="outline">
                  Generate SLA Report
                </Button>
                <Button className="w-full" variant="outline">
                  Configure SLA Rules
                </Button>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/admin/forms/submissions?overdue=true">
                    View All Overdue
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                  <div>
                    <div>Submission #1 escalated</div>
                    <div className="text-gray-500">2 hours ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
                  <div>
                    <div>SLA breach alert sent</div>
                    <div className="text-gray-500">4 hours ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <div>
                    <div>Complaint #5 resolved</div>
                    <div className="text-gray-500">6 hours ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
/**
 * Admin Submissions Management Page
 * View and manage all form submissions with filtering and SLA tracking
 * Part of PR07: Form Builder & SLA Engine
 */

import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Search, 
  Filter, 
  Eye, 
  UserCheck,
  Clock,
  AlertTriangle,
  BarChart,
  Download,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

// Mock data for demonstration - in real implementation, this would come from API
interface SubmissionListItem {
  id: string
  formName: string
  formId: string
  submitterName?: string
  submitterEmail?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'
  assignedTo?: {
    name: string
    email: string
  }
  createdAt: string
  slaDue: string
  isOverdue: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
}

// Mock data
const mockSubmissions: SubmissionListItem[] = [
  {
    id: '1',
    formName: 'Complaint Registration Form',
    formId: 'form1',
    submitterName: 'Rajesh Kumar',
    submitterEmail: 'rajesh@email.com',
    status: 'PENDING',
    createdAt: '2024-09-01T10:30:00Z',
    slaDue: '2024-09-15T17:00:00Z',
    isOverdue: false,
    priority: 'high',
    category: 'complaint'
  },
  {
    id: '2',
    formName: 'RTI Request Form',
    formId: 'form3',
    submitterName: 'Priya Sharma',
    submitterEmail: 'priya@email.com',
    status: 'IN_PROGRESS',
    assignedTo: { name: 'Admin User', email: 'admin@example.com' },
    createdAt: '2024-08-28T14:15:00Z',
    slaDue: '2024-09-27T17:00:00Z',
    isOverdue: false,
    priority: 'medium',
    category: 'rti'
  },
  {
    id: '3',
    formName: 'Complaint Registration Form',
    formId: 'form1',
    submitterName: 'Anonymous',
    status: 'ESCALATED',
    assignedTo: { name: 'Supervisor', email: 'supervisor@example.com' },
    createdAt: '2024-08-20T09:45:00Z',
    slaDue: '2024-09-03T17:00:00Z',
    isOverdue: true,
    priority: 'critical',
    category: 'complaint'
  },
  {
    id: '4',
    formName: 'Citizen Suggestion Form',
    formId: 'form2',
    submitterName: 'Amit Singh',
    submitterEmail: 'amit@email.com',
    status: 'RESOLVED',
    assignedTo: { name: 'Editor User', email: 'editor@example.com' },
    createdAt: '2024-08-25T16:20:00Z',
    slaDue: '2024-09-24T17:00:00Z',
    isOverdue: false,
    priority: 'low',
    category: 'suggestion'
  }
]

function SubmissionsTable({ submissions }: { submissions: SubmissionListItem[] }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'RESOLVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'ESCALATED': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
            <TableHead>Submission Details</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id} className={submission.isOverdue ? 'bg-red-50' : ''}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {submission.submitterName || 'Anonymous'}
                  </div>
                  {submission.submitterEmail && (
                    <div className="text-sm text-gray-500">
                      {submission.submitterEmail}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">ID: {submission.id}</div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium text-sm">{submission.formName}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {submission.category}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={getStatusColor(submission.status)}
                >
                  {submission.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={getPriorityColor(submission.priority)}
                >
                  {submission.priority}
                </Badge>
              </TableCell>
              <TableCell>
                {submission.assignedTo ? (
                  <div className="text-sm">
                    <div className="font-medium">{submission.assignedTo.name}</div>
                    <div className="text-gray-500">{submission.assignedTo.email}</div>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className={`flex items-center gap-1 ${submission.isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                    {submission.isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
                    {formatDate(submission.slaDue)}
                  </div>
                  {submission.isOverdue && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      Overdue
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatDate(submission.createdAt)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    title="View submission"
                    asChild
                  >
                    <Link href={`/admin/forms/submissions/${submission.id}`}>
                      <Eye size={16} />
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    title="Assign submission"
                  >
                    <UserCheck size={16} />
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

function StatsCards() {
  const stats = [
    {
      title: 'Total Submissions',
      value: '47',
      change: '+12 this week',
      changeType: 'positive' as const,
      icon: BarChart
    },
    {
      title: 'Pending Review',
      value: '18',
      change: '38% of total',
      changeType: 'neutral' as const,
      icon: Clock
    },
    {
      title: 'Overdue',
      value: '3',
      change: '+1 since yesterday',
      changeType: 'negative' as const,
      icon: AlertTriangle
    },
    {
      title: 'Avg Response Time',
      value: '4.2d',
      change: '-0.8d vs last week',
      changeType: 'positive' as const,
      icon: RefreshCw
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'negative' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default async function AdminSubmissionsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if user has permission to view submissions
  const hasPermission = await checkPermission(session.user.id, 'submissions', 'read')
  if (!hasPermission) {
    redirect('/admin')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Form Submissions</h1>
          <p className="text-gray-600">
            Monitor and manage all form submissions with SLA tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input 
                  placeholder="Search submissions..." 
                  className="pl-10 w-64"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  <SelectItem value="complaint">Complaints</SelectItem>
                  <SelectItem value="suggestion">Suggestions</SelectItem>
                  <SelectItem value="rti">RTI Requests</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter size={16} className="mr-2" />
                More Filters
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              Showing {mockSubmissions.length} submissions
            </div>
          </div>

          <Suspense fallback={<div>Loading submissions...</div>}>
            <SubmissionsTable submissions={mockSubmissions} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
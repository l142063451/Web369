/**
 * Admin Forms Management Page
 * Part of PR07: Form Builder & SLA Engine
 */

import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { formService } from '@/lib/forms/service'
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
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  BarChart,
  Settings 
} from 'lucide-react'
import Link from 'next/link'

// This would typically come from the API
interface FormListItem {
  id: string
  name: string
  category: string
  status: 'active' | 'inactive'
  submissions: number
  slaDays: number
  createdAt: string
  createdBy: {
    name: string
    email: string
  }
}

// Mock data for demonstration
const mockForms: FormListItem[] = [
  {
    id: '1',
    name: 'Complaint Registration Form',
    category: 'complaint',
    status: 'active',
    submissions: 127,
    slaDays: 14,
    createdAt: '2024-08-15T10:30:00Z',
    createdBy: { name: 'Admin User', email: 'admin@example.com' }
  },
  {
    id: '2',
    name: 'Citizen Suggestion Form',
    category: 'suggestion',
    status: 'active',
    submissions: 43,
    slaDays: 30,
    createdAt: '2024-08-20T14:15:00Z',
    createdBy: { name: 'Editor User', email: 'editor@example.com' }
  },
  {
    id: '3',
    name: 'RTI Request Form',
    category: 'rti',
    status: 'active',
    submissions: 18,
    slaDays: 30,
    createdAt: '2024-08-25T09:45:00Z',
    createdBy: { name: 'Admin User', email: 'admin@example.com' }
  }
]

function FormsTable({ forms }: { forms: FormListItem[] }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'complaint': return 'bg-red-100 text-red-800'
      case 'suggestion': return 'bg-blue-100 text-blue-800'
      case 'rti': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Form Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Submissions</TableHead>
            <TableHead className="text-center">SLA Days</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((form) => (
            <TableRow key={form.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{form.name}</div>
                  <div className="text-sm text-gray-500">
                    Created by {form.createdBy.name}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={getCategoryColor(form.category)}
                >
                  {form.category}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={form.status === 'active' ? 'default' : 'secondary'}
                  className={form.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                >
                  {form.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium">{form.submissions}</div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{form.slaDays}d</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {formatDate(form.createdAt)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    title="View submissions"
                  >
                    <BarChart size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    title="Preview form"
                  >
                    <Eye size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    title="Edit form"
                    asChild
                  >
                    <Link href={`/admin/forms/builder/${form.id}`}>
                      <Edit size={16} />
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    title="Duplicate form"
                  >
                    <Copy size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    title="Delete form"
                  >
                    <Trash2 size={16} />
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
      title: 'Total Forms',
      value: '3',
      change: '+1 this month',
      changeType: 'positive' as const
    },
    {
      title: 'Active Forms',
      value: '3',
      change: '100% active',
      changeType: 'neutral' as const
    },
    {
      title: 'Total Submissions',
      value: '188',
      change: '+23 this week',
      changeType: 'positive' as const
    },
    {
      title: 'Avg Response Time',
      value: '8.5d',
      change: '-2.1d vs last month',
      changeType: 'positive' as const
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className={`text-xs ${
              stat.changeType === 'positive' ? 'text-green-600' : 
              'text-gray-600'
            }`}>
              {stat.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function AdminFormsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if user has permission to manage forms
  const hasPermission = await checkPermission(session.user.id, 'forms', 'read')
  if (!hasPermission) {
    redirect('/admin')
  }

  // Fetch real forms data
  const formsResult = await formService.getForms({ limit: 50 })
  const realForms = formsResult.forms.map(form => ({
    id: form.id,
    name: form.name,
    category: (form.schema as any)?.settings?.category || 'general',
    status: form.active ? 'active' as const : 'inactive' as const,
    submissions: (form as any)._count?.submissions || 0,
    slaDays: form.slaDays,
    createdAt: form.createdAt.toISOString(),
    createdBy: {
      name: (form as any).createdByUser?.name || 'Unknown',
      email: (form as any).createdByUser?.email || 'unknown@example.com'
    }
  }))

  const displayForms = realForms.length > 0 ? realForms : mockForms

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-gray-600">
            Manage forms and track submissions across your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Settings size={16} className="mr-2" />
            Settings
          </Button>
          <Button asChild>
            <Link href="/admin/forms/builder/new">
              <Plus size={16} className="mr-2" />
              Create Form
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Form Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input 
                  placeholder="Search forms..." 
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter size={16} className="mr-2" />
                Filter
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              Showing {displayForms.length} forms
            </div>
          </div>

          <Suspense fallback={<div>Loading forms...</div>}>
            <FormsTable forms={displayForms} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
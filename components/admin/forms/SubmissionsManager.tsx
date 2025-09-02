/**
 * Submissions Manager Component
 * Based on INSTRUCTIONS_FOR_COPILOT.md §7
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  FileText
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Submission {
  id: string
  formId: string
  status: string
  createdAt: string
  slaDue: string
  form: {
    name: string
  }
  user?: {
    name: string
    email: string
  }
  assignedUser?: {
    name: string
  }
  slaInfo: {
    status: 'on-track' | 'at-risk' | 'breached' | 'completed'
    hoursRemaining: number
    message: string
  }
}

interface SLAStats {
  onTrack: number
  atRisk: number
  breached: number
  completed: number
}

interface SubmissionsManagerProps {}

export function SubmissionsManager({}: SubmissionsManagerProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<SLAStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [slaFilter, setSlaFilter] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  useEffect(() => {
    loadSubmissions()
  }, [statusFilter, slaFilter, searchTerm])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (slaFilter !== 'all') params.set('slaStatus', slaFilter)
      if (searchTerm) params.set('search', searchTerm)
      
      const response = await fetch(`/api/admin/submissions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.data.submissions)
        setStats(data.data.slaStats)
      }
    } catch (error) {
      console.error('Failed to load submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'secondary' as const, label: 'Pending' },
      IN_PROGRESS: { variant: 'default' as const, label: 'In Progress' },
      RESOLVED: { variant: 'default' as const, label: 'Resolved' },
      REJECTED: { variant: 'destructive' as const, label: 'Rejected' },
      ESCALATED: { variant: 'destructive' as const, label: 'Escalated' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getSLABadge = (slaInfo: Submission['slaInfo']) => {
    const slaConfig = {
      'on-track': { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      'at-risk': { variant: 'default' as const, icon: Clock, color: 'text-yellow-600' },
      'breached': { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      'completed': { variant: 'secondary' as const, icon: CheckCircle, color: 'text-gray-600' }
    }
    const config = slaConfig[slaInfo.status]
    const IconComponent = config.icon
    
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        <IconComponent size={14} />
        <span className="text-xs font-medium">{slaInfo.message}</span>
      </div>
    )
  }

  const getStatsCard = (title: string, count: number, variant: 'default' | 'warning' | 'danger' | 'success') => {
    const variantClasses = {
      default: 'bg-blue-50 text-blue-700 border-blue-200',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-200', 
      danger: 'bg-red-50 text-red-700 border-red-200',
      success: 'bg-green-50 text-green-700 border-green-200'
    }
    
    return (
      <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm font-medium">{title}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submissions Management</h1>
        <p className="text-gray-600">Monitor and manage form submissions with SLA tracking</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {getStatsCard('On Track', stats.onTrack, 'success')}
          {getStatsCard('At Risk', stats.atRisk, 'warning')}
          {getStatsCard('Breached', stats.breached, 'danger')}
          {getStatsCard('Completed', stats.completed, 'default')}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search submissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter size={16} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
          </SelectContent>
        </Select>

        <Select value={slaFilter} onValueChange={setSlaFilter}>
          <SelectTrigger className="w-[140px]">
            <Clock size={16} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All SLA</SelectItem>
            <SelectItem value="breached">Breached</SelectItem>
            <SelectItem value="at-risk">At Risk</SelectItem>
            <SelectItem value="on-track">On Track</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions List */}
      <div className="space-y-2">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No submissions found
          </div>
        ) : (
          submissions.map((submission) => (
            <Dialog key={submission.id}>
              <DialogTrigger asChild>
                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-4">
                      {/* Form & Status */}
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{submission.form.name}</div>
                        {getStatusBadge(submission.status)}
                      </div>
                      
                      {/* Submitter */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-gray-600">
                          <User size={14} />
                          <span className="text-sm">
                            {submission.user?.name || 'Anonymous'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {submission.user?.email}
                        </div>
                      </div>
                      
                      {/* Assigned To */}
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Assigned to</div>
                        <div className="text-sm text-gray-900">
                          {submission.assignedUser?.name || 'Unassigned'}
                        </div>
                      </div>
                      
                      {/* SLA Status */}
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">SLA Status</div>
                        {getSLABadge(submission.slaInfo)}
                      </div>
                      
                      {/* Created Date */}
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Submitted</div>
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Calendar size={14} />
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Submission Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Form</label>
                      <div className="text-sm text-gray-900">{submission.form.name}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div>{getStatusBadge(submission.status)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">SLA Information</label>
                    <div className="mt-1">{getSLABadge(submission.slaInfo)}</div>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button variant="default" size="sm">
                      Take Action
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText size={16} className="mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
    </div>
  )
}
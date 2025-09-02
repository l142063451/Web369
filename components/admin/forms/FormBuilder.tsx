/**
 * Form Builder - Main Component
 * Based on INSTRUCTIONS_FOR_COPILOT.md §7
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Eye, Trash2, Settings, BarChart3 } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Form {
  id: string
  name: string
  active: boolean
  slaDays: number
  createdAt: string
  _count: {
    submissions: number
  }
}

interface FormBuilderProps {}

export function FormBuilder({}: FormBuilderProps) {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadForms()
  }, [statusFilter, searchTerm])

  const loadForms = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter === 'inactive') params.set('active', 'false')
      if (searchTerm) params.set('search', searchTerm)
      
      const response = await fetch(`/api/admin/forms?${params}`)
      if (response.ok) {
        const data = await response.json()
        setForms(data.data.forms)
      }
    } catch (error) {
      console.error('Failed to load forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (form: Form) => {
    if (!form.active) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const getSLABadge = (slaDays: number) => {
    if (slaDays <= 1) return <Badge variant="destructive">{slaDays}d</Badge>
    if (slaDays <= 3) return <Badge variant="default">{slaDays}d</Badge>
    return <Badge variant="secondary">{slaDays}d</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-gray-600">Create and manage dynamic forms with SLA tracking</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
              <DialogDescription>
                Build a dynamic form with custom fields and validation rules
              </DialogDescription>
            </DialogHeader>
            {/* Form creation content would go here */}
            <div className="p-4 text-center text-gray-500">
              Form creation interface coming soon...
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter size={16} />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Forms</SelectItem>
            <SelectItem value="inactive">Inactive Forms</SelectItem>
            <SelectItem value="all">All Forms</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Forms List */}
      <div className="space-y-4">
        {forms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">No forms found</div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus size={16} className="mr-2" />
              Create Your First Form
            </Button>
          </div>
        ) : (
          forms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{form.name}</h3>
                    {getStatusBadge(form)}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">SLA:</span>
                      {getSLABadge(form.slaDays)}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>{form._count.submissions} submissions</span>
                    <span>Created {new Date(form.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title="View Submissions"
                  >
                    <Link href={`/admin/submissions?formId=${form.id}`}>
                      <BarChart3 size={16} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title="Preview Form"
                  >
                    <Link href={`/forms/${form.id}/preview`}>
                      <Eye size={16} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title="Edit Form"
                  >
                    <Link href={`/admin/forms/${form.id}/edit`}>
                      <Edit size={16} />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Form Settings"
                  >
                    <Settings size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete Form"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
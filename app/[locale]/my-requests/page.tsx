/**
 * My Requests Page - PR08
 * Citizen dashboard for tracking service requests
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { getAllServiceCategories, getServiceCategory, STATUS_COLORS, type ServiceType } from '@/lib/services/config'
import type { Submission } from '@/lib/forms/service'

interface ExtendedSubmission extends Submission {
  serviceType?: ServiceType
  title?: string
}

export default function MyRequestsPage() {
  const t = useTranslations('my-requests')
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  
  const [requests, setRequests] = useState<ExtendedSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ServiceType | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('all')

  useEffect(() => {
    if (session?.user?.id) {
      fetchRequests()
    }
  }, [session])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/citizen/requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.serviceType === filter
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    return matchesFilter && matchesStatus
  })

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('auth_required', { defaultValue: 'Authentication Required' })}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('auth_message', { defaultValue: 'Please sign in to view your service requests.' })}
            </p>
            <Button onClick={() => router.push('/auth/signin')}>
              {t('sign_in', { defaultValue: 'Sign In' })}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t('title', { defaultValue: 'My Requests' })}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('subtitle', { defaultValue: 'Track all your service requests in one place' })}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link href="/services">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  {t('new_request', { defaultValue: 'New Request' })}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="service-filter" className="block text-sm font-medium text-gray-700 mb-2">
                {t('filter_by_service', { defaultValue: 'Filter by Service' })}
              </label>
              <select
                id="service-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">{t('all_services', { defaultValue: 'All Services' })}</option>
                {getAllServiceCategories().map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.icon} {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                {t('filter_by_status', { defaultValue: 'Filter by Status' })}
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">{t('all_statuses', { defaultValue: 'All Statuses' })}</option>
                <option value="PENDING">{t('status.pending', { defaultValue: 'Pending' })}</option>
                <option value="IN_PROGRESS">{t('status.in_progress', { defaultValue: 'In Progress' })}</option>
                <option value="RESOLVED">{t('status.resolved', { defaultValue: 'Resolved' })}</option>
                <option value="REJECTED">{t('status.rejected', { defaultValue: 'Rejected' })}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">{t('loading', { defaultValue: 'Loading requests...' })}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('no_requests', { defaultValue: 'No Requests Found' })}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? t('no_requests_message', { defaultValue: "You haven't submitted any service requests yet." })
                : t('no_requests_filtered', { defaultValue: 'No requests found matching your filters.' })
              }
            </p>
            <Link href="/services">
              <Button>{t('submit_first_request', { defaultValue: 'Submit Your First Request' })}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <RequestCard 
                key={request.id} 
                request={request} 
                highlighted={request.id === highlightId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface RequestCardProps {
  request: ExtendedSubmission
  highlighted: boolean
}

function RequestCard({ request, highlighted }: RequestCardProps) {
  const t = useTranslations('my-requests')
  
  // Mock service type extraction from request data or form ID
  const serviceType = request.serviceType || 'complaint'
  const serviceConfig = getServiceCategory(serviceType as ServiceType)
  const title = request.title || request.data?.title || 'Service Request'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'RESOLVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'ESCALATED':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getDaysUntilDue = (slaDue: Date | string) => {
    const due = typeof slaDue === 'string' ? new Date(slaDue) : slaDue
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilDue = getDaysUntilDue(request.slaDue)
  const isOverdue = daysUntilDue < 0

  return (
    <div className={`
      bg-white rounded-lg shadow-sm border-l-4 p-6 transition-all duration-200
      ${highlighted ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''}
      ${STATUS_COLORS[serviceConfig.color]} border-l-current
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Service Type and Title */}
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl">{serviceConfig.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h3>
              <p className="text-sm text-gray-600">{serviceConfig.name}</p>
            </div>
          </div>

          {/* Status and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {t('status', { defaultValue: 'Status' })}
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                {request.status.replace('_', ' ')}
              </span>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {t('submitted', { defaultValue: 'Submitted' })}
              </div>
              <div className="text-sm text-gray-900">
                {formatDate(request.createdAt)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {t('due_date', { defaultValue: 'Due Date' })}
              </div>
              <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : daysUntilDue <= 1 ? 'text-orange-600' : 'text-gray-900'}`}>
                {formatDate(request.slaDue)}
                {isOverdue && ' (Overdue)'}
                {!isOverdue && daysUntilDue <= 1 && ' (Due Soon)'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 ml-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => alert('Request details will be implemented')}
          >
            {t('view_details', { defaultValue: 'View Details' })}
          </Button>
        </div>
      </div>

      {/* Request ID */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {t('request_id', { defaultValue: 'Request ID' })}: {request.id}
        </span>
      </div>
    </div>
  )
}

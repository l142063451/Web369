/**
 * Admin Notices Management Page
 * PR12 - News/Notices/Events - Admin Interface for Notices
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, FileText, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { NoticesService } from '@/lib/news-events'

export default async function AdminNoticesPage() {
  // Get notices and dashboard summary
  const { notices, pagination } = await NoticesService.list({
    page: 1,
    limit: 20
  })
  const summary = await NoticesService.getDashboardSummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notices Management</h1>
          <p className="mt-2 text-gray-600">
            Create and manage official notices with deadlines and attachments
          </p>
        </div>
        <Link href="/admin/notices/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Notice
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Notices</p>
              <p className="text-2xl font-bold text-gray-900">{summary.stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{summary.stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With Deadlines</p>
              <p className="text-2xl font-bold text-blue-600">{summary.stats.withDeadlines}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{summary.stats.expired}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines Alert */}
      {summary.upcomingDeadlines.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Upcoming Deadlines ({summary.upcomingDeadlines.length})
              </h3>
              <div className="mt-2 space-y-1">
                {summary.upcomingDeadlines.slice(0, 3).map((notice: any) => (
                  <p key={notice.id} className="text-sm text-yellow-700">
                    <strong>{notice.title}</strong> - {notice.deadline ? new Date(notice.deadline).toLocaleDateString() : 'No date'}
                  </p>
                ))}
                {summary.upcomingDeadlines.length > 3 && (
                  <p className="text-sm text-yellow-700">
                    and {summary.upcomingDeadlines.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notices List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Notices</h2>
        </div>
        
        <Suspense fallback={<Loading />}>
          <div className="divide-y">
            {notices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No notices</h3>
                <p className="mt-2 text-gray-500">
                  Get started by creating your first official notice.
                </p>
                <Link href="/admin/notices/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Notice
                  </Button>
                </Link>
              </div>
            ) : (
              notices.map((notice) => (
                <div key={notice.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {notice.title}
                        </h3>
                        <Badge variant="outline">
                          {notice.category}
                        </Badge>
                        {notice.deadline && (
                          <Badge 
                            variant={
                              new Date(notice.deadline) < new Date() ? 'destructive' : 
                              new Date(notice.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'secondary' :
                              'outline'
                            }
                          >
                            {new Date(notice.deadline) < new Date() ? 'Expired' : 'Deadline: ' + new Date(notice.deadline).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-2 line-clamp-2">
                        {notice.body.length > 150 ? `${notice.body.substring(0, 150)}...` : notice.body}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Created: {new Date(notice.createdAt).toLocaleDateString()}</span>
                        {notice.attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {notice.attachments.length} attachment{notice.attachments.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/notices/${notice.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/notices/${notice.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Suspense>
      </div>
    </div>
  )
}
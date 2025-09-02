'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RefreshCw, Search, Filter, Download } from 'lucide-react'

interface AuditLog {
  id: string
  actorId: string
  action: string
  resource: string
  resourceId: string
  diff: any
  createdAt: string
  actor?: {
    name?: string
    email?: string
  }
}

export function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/audit-logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'assign_role':
        return 'default'
      case 'update':
      case 'edit':
        return 'secondary'
      case 'delete':
      case 'remove_role':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.action.toLowerCase() !== filter.toLowerCase()) {
      return false
    }
    if (searchTerm && !log.resource.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !log.action.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="assign_role">Role Changes</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
          <CardDescription>
            {filteredLogs.length} log entries found
            {searchTerm && ` matching "${searchTerm}"`}
            {filter !== 'all' && ` filtered by ${filter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No audit logs found</p>
              <p className="text-xs">Logs will appear here as administrators make changes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getActionBadgeColor(log.action)}>
                          {log.action.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">
                          {log.resource}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{log.resourceId}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        by {log.actor?.name || log.actor?.email || 'Unknown User'}
                      </div>
                      {log.diff && Object.keys(log.diff).length > 0 && (
                        <details className="text-xs text-gray-500">
                          <summary className="cursor-pointer hover:text-gray-700">
                            View changes
                          </summary>
                          <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.diff, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {formatTimestamp(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
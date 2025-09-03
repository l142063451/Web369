/**
 * Security Dashboard Component for Admin Panel
 * 
 * Provides comprehensive security monitoring and accessibility metrics
 * for PR16 security hardening and accessibility features
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon, 
  EyeIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface SecurityMetrics {
  cspViolations: {
    total: number
    critical: number
    lastDay: number
    topSources: Array<{ source: string; count: number }>
  }
  rateLimitHits: {
    total: number
    blocked: number
    lastHour: number
    topIPs: Array<{ ip: string; count: number }>
  }
  accessibilityScore: {
    overall: number
    wcag22AA: boolean
    violations: number
    lastScan: string
  }
  authEvents: {
    loginAttempts: number
    failed: number
    blocked: number
    twoFAEnabled: number
  }
}

interface AccessibilityIssue {
  id: string
  rule: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  element: string
  page: string
  fixSuggestion: string
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [accessibilityIssues, setAccessibilityIssues] = useState<AccessibilityIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadSecurityMetrics()
    loadAccessibilityIssues()
  }, [])

  const loadSecurityMetrics = async () => {
    try {
      const response = await fetch('/api/admin/security/metrics')
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to load security metrics:', error)
      // Mock data for demonstration
      setMetrics({
        cspViolations: {
          total: 12,
          critical: 3,
          lastDay: 5,
          topSources: [
            { source: 'inline script', count: 8 },
            { source: 'external font', count: 4 },
          ]
        },
        rateLimitHits: {
          total: 156,
          blocked: 23,
          lastHour: 12,
          topIPs: [
            { ip: '192.168.1.100', count: 15 },
            { ip: '10.0.0.45', count: 8 },
          ]
        },
        accessibilityScore: {
          overall: 92,
          wcag22AA: true,
          violations: 3,
          lastScan: '2024-03-15T10:30:00Z'
        },
        authEvents: {
          loginAttempts: 284,
          failed: 12,
          blocked: 3,
          twoFAEnabled: 15
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAccessibilityIssues = async () => {
    try {
      const response = await fetch('/api/admin/accessibility/issues')
      const data = await response.json()
      setAccessibilityIssues(data)
    } catch (error) {
      console.error('Failed to load accessibility issues:', error)
      // Mock data
      setAccessibilityIssues([
        {
          id: '1',
          rule: 'color-contrast',
          impact: 'serious',
          description: 'Element has insufficient color contrast',
          element: 'button.secondary',
          page: '/admin/forms',
          fixSuggestion: 'Increase contrast ratio to at least 4.5:1'
        },
        {
          id: '2',
          rule: 'image-alt',
          impact: 'moderate',
          description: 'Image missing alt text',
          element: 'img.profile-photo',
          page: '/admin/users',
          fixSuggestion: 'Add descriptive alt attribute'
        }
      ])
    }
  }

  const runAccessibilityScan = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/accessibility/scan', {
        method: 'POST',
      })
      const result = await response.json()
      
      // Refresh data after scan
      await loadSecurityMetrics()
      await loadAccessibilityIssues()
      
      alert('Accessibility scan completed successfully!')
    } catch (error) {
      console.error('Failed to run accessibility scan:', error)
      alert('Failed to run accessibility scan')
    } finally {
      setLoading(false)
    }
  }

  const generateSecurityReport = async () => {
    try {
      const response = await fetch('/api/admin/security/report', {
        method: 'POST',
      })
      const blob = await response.blob()
      
      // Download the report
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to generate security report:', error)
      alert('Failed to generate security report')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security & Accessibility Dashboard</h1>
          <p className="text-gray-600">Monitor security events and accessibility compliance</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={runAccessibilityScan} variant="outline">
            <EyeIcon className="w-4 h-4 mr-2" />
            Run A11y Scan
          </Button>
          <Button onClick={generateSecurityReport}>
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CSP Status</CardTitle>
                <ShieldCheckIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.cspViolations.critical === 0 ? 'Secure' : 'Attention'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.cspViolations.critical} critical violations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WCAG 2.2 AA</CardTitle>
                <EyeIcon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.accessibilityScore.wcag22AA ? 'Compliant' : 'Issues'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Score: {metrics?.accessibilityScore.overall}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
                <ClockIcon className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.rateLimitHits.blocked}
                </div>
                <p className="text-xs text-muted-foreground">
                  Blocked requests (last hour)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auth Security</CardTitle>
                <ShieldCheckIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.authEvents.twoFAEnabled}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users with 2FA enabled
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Security Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-red-900">Critical CSP Violation</p>
                      <p className="text-sm text-red-700">Inline script blocked on /admin/forms</p>
                    </div>
                  </div>
                  <Badge variant="destructive">Critical</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-yellow-900">Rate Limit Hit</p>
                      <p className="text-sm text-yellow-700">IP 192.168.1.100 blocked for 15 minutes</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Warning</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <EyeIcon className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-blue-900">Accessibility Issue Fixed</p>
                      <p className="text-sm text-blue-700">Color contrast improved on login form</p>
                    </div>
                  </div>
                  <Badge variant="outline">Info</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CSP Violations</CardTitle>
                <CardDescription>Content Security Policy violations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total violations</span>
                    <span className="font-medium">{metrics?.cspViolations.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical violations</span>
                    <span className="font-medium text-red-600">{metrics?.cspViolations.critical}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last 24 hours</span>
                    <span className="font-medium">{metrics?.cspViolations.lastDay}</span>
                  </div>
                  
                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Top Violation Sources</h4>
                    {metrics?.cspViolations.topSources.map((source, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{source.source}</span>
                        <span>{source.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>Request rate limiting statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total hits</span>
                    <span className="font-medium">{metrics?.rateLimitHits.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blocked requests</span>
                    <span className="font-medium text-red-600">{metrics?.rateLimitHits.blocked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last hour</span>
                    <span className="font-medium">{metrics?.rateLimitHits.lastHour}</span>
                  </div>
                  
                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Top Source IPs</h4>
                    {metrics?.rateLimitHits.topIPs.map((ip, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{ip.ip}</span>
                        <span>{ip.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Score</CardTitle>
              <CardDescription>
                Last scan: {metrics?.accessibilityScore.lastScan ? 
                  new Date(metrics.accessibilityScore.lastScan).toLocaleString() : 
                  'Never'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl font-bold text-blue-600">
                  {metrics?.accessibilityScore.overall}%
                </div>
                <div>
                  <Badge 
                    variant={metrics?.accessibilityScore.wcag22AA ? "default" : "destructive"}
                  >
                    WCAG 2.2 AA {metrics?.accessibilityScore.wcag22AA ? 'Compliant' : 'Non-Compliant'}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {metrics?.accessibilityScore.violations} violations found
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accessibility Issues</CardTitle>
              <CardDescription>Current accessibility violations that need attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessibilityIssues.map((issue) => (
                  <div key={issue.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={issue.impact === 'critical' || issue.impact === 'serious' 
                            ? "destructive" : "secondary"}
                        >
                          {issue.impact}
                        </Badge>
                        <span className="font-medium">{issue.rule}</span>
                      </div>
                      <span className="text-sm text-gray-500">{issue.page}</span>
                    </div>
                    <p className="text-gray-700 mb-2">{issue.description}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Element:</strong> <code className="bg-gray-100 px-1 rounded">{issue.element}</code>
                    </p>
                    <p className="text-sm text-blue-600">
                      <strong>Fix suggestion:</strong> {issue.fixSuggestion}
                    </p>
                  </div>
                ))}

                {accessibilityIssues.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <EyeIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No accessibility issues found!</p>
                    <p className="text-sm">Your application meets WCAG 2.2 AA standards.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Reports</CardTitle>
              <CardDescription>Generate comprehensive security and accessibility reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={generateSecurityReport} className="w-full">
                  <DocumentTextIcon className="w-4 h-4 mr-2" />
                  Generate Security Report (PDF)
                </Button>
                
                <Button variant="outline" className="w-full">
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Export Metrics (CSV)
                </Button>
                
                <Button variant="outline" className="w-full">
                  <EyeIcon className="w-4 h-4 mr-2" />
                  Accessibility Compliance Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
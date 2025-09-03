/**
 * Audience Builder Component
 * Advanced interface for selecting and configuring notification audiences
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, 
  UserCog, 
  Settings, 
  Eye,
  RefreshCw 
} from 'lucide-react'

interface AudienceBuilderProps {
  audience: {
    type: 'ALL' | 'ROLE' | 'CUSTOM'
    criteria: any
  }
  onAudienceChange: (audience: any) => void
}

interface UserSegments {
  roles: Array<{ value: string; label: string }>
  wards: Array<{ value: string; label: string }>
  locales: Array<{ value: string; label: string }>
  interests: Array<{ value: string; label: string }>
}

interface AudiencePreview {
  estimatedSize: number
  preview: Array<{
    id: string
    name?: string
    email?: string
    phone?: string
    roles: string[]
  }>
  hasMore: boolean
}

export function AudienceBuilder({ audience, onAudienceChange }: AudienceBuilderProps) {
  const [segments, setSegments] = useState<UserSegments | null>(null)
  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Load user segments on component mount
  useEffect(() => {
    fetchSegments()
  }, [])

  // Update preview when audience changes
  useEffect(() => {
    if (audience.type && audience.criteria) {
      fetchPreview()
    }
  }, [audience])

  const fetchSegments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications/segments')
      const data = await response.json()
      
      if (data.success) {
        setSegments(data.segments)
      }
    } catch (error) {
      console.error('Failed to fetch user segments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreview = async () => {
    try {
      setPreviewLoading(true)
      const response = await fetch('/api/notifications/audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audience)
      })

      const data = await response.json()
      
      if (data.success) {
        setPreview({
          estimatedSize: data.estimatedSize,
          preview: data.preview,
          hasMore: data.hasMore
        })
      }
    } catch (error) {
      console.error('Failed to fetch audience preview:', error)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleAudienceTypeChange = (type: 'ALL' | 'ROLE' | 'CUSTOM') => {
    onAudienceChange({
      type,
      criteria: {}
    })
  }

  const handleCriteriaChange = (key: string, value: any) => {
    onAudienceChange({
      ...audience,
      criteria: {
        ...audience.criteria,
        [key]: value
      }
    })
  }

  const handleRoleToggle = (role: string, checked: boolean) => {
    const currentRoles = audience.criteria.roles || []
    const newRoles = checked
      ? [...currentRoles, role]
      : currentRoles.filter((r: string) => r !== role)
    
    handleCriteriaChange('roles', newRoles)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading audience builder...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Audience Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Audience Type</CardTitle>
          <CardDescription>
            Choose how you want to target your audience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                type: 'ALL' as const,
                title: 'All Users',
                description: 'Send to everyone',
                icon: Users
              },
              {
                type: 'ROLE' as const,
                title: 'By Role',
                description: 'Target specific user roles',
                icon: UserCog
              },
              {
                type: 'CUSTOM' as const,
                title: 'Custom Criteria',
                description: 'Advanced filtering options',
                icon: Settings
              }
            ].map((option) => (
              <div
                key={option.type}
                onClick={() => handleAudienceTypeChange(option.type)}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  audience.type === option.type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <option.icon className="h-6 w-6 mb-2" />
                <h3 className="font-semibold">{option.title}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role-based Criteria */}
      {audience.type === 'ROLE' && segments && (
        <Card>
          <CardHeader>
            <CardTitle>Select Roles</CardTitle>
            <CardDescription>
              Choose which user roles to include in your audience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {segments.roles.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={audience.criteria.roles?.includes(role.value) || false}
                    onCheckedChange={(checked) => handleRoleToggle(role.value, checked as boolean)}
                  />
                  <Label htmlFor={`role-${role.value}`} className="text-sm">
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Criteria */}
      {audience.type === 'CUSTOM' && segments && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Criteria</CardTitle>
            <CardDescription>
              Define advanced filtering criteria for your audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Roles */}
            <div className="space-y-3">
              <Label>User Roles (optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                {segments.roles.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`custom-role-${role.value}`}
                      checked={audience.criteria.roles?.includes(role.value) || false}
                      onCheckedChange={(checked) => handleRoleToggle(role.value, checked as boolean)}
                    />
                    <Label htmlFor={`custom-role-${role.value}`} className="text-sm">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Wards */}
            <div className="space-y-3">
              <Label>Wards (optional)</Label>
              <Select
                value={audience.criteria.wards?.[0] || ''}
                onValueChange={(value) => handleCriteriaChange('wards', value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Wards</SelectItem>
                  {segments.wards.map((ward) => (
                    <SelectItem key={ward.value} value={ward.value}>
                      {ward.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Preference */}
            <div className="space-y-3">
              <Label>Language Preference</Label>
              <Select
                value={audience.criteria.locale?.[0] || ''}
                onValueChange={(value) => handleCriteriaChange('locale', value ? [value] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  {segments.locales.map((locale) => (
                    <SelectItem key={locale.value} value={locale.value}>
                      {locale.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Method Requirements */}
            <div className="space-y-3">
              <Label>Contact Method Requirements</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has-email"
                    checked={audience.criteria.hasEmail === true}
                    onCheckedChange={(checked) => 
                      handleCriteriaChange('hasEmail', checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="has-email" className="text-sm">
                    Must have email address
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has-phone"
                    checked={audience.criteria.hasPhone === true}
                    onCheckedChange={(checked) => 
                      handleCriteriaChange('hasPhone', checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="has-phone" className="text-sm">
                    Must have phone number
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audience Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Audience Preview
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {preview.estimatedSize} users
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchPreview}
                  disabled={previewLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${previewLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Preview of users who will receive this notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading preview...</p>
              </div>
            ) : preview.preview.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">No users match your criteria</p>
                <p className="text-muted-foreground">Try adjusting your audience settings.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {preview.preview.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email || user.phone || user.id}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                
                {preview.hasMore && (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">
                      And {preview.estimatedSize - preview.preview.length} more users...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
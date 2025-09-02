/**
 * Dynamic Form Renderer
 * Renders forms from JSON schema for public access
 * Part of PR07: Form Builder & SLA Engine
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { TurnstileWidget, useTurnstile } from '@/components/security/TurnstileWidget'
import { FormSchema, FormFieldDefinition, generateZodSchema, validateFormDataFromFields } from '@/lib/forms/schema'
import { getCurrentTurnstileConfig } from '@/lib/security/turnstile'
import { Loader2, CheckCircle, AlertCircle, Upload, MapPin } from 'lucide-react'

interface DynamicFormProps {
  formSchema: FormSchema
  onSubmit: (data: Record<string, unknown>, turnstileToken?: string) => Promise<void>
  loading?: boolean
  success?: boolean
  error?: string | null
}

interface FileUploadState {
  files: File[]
  uploading: boolean
  progress: number
  errors: string[]
}

export function DynamicForm({ 
  formSchema, 
  onSubmit, 
  loading = false, 
  success = false,
  error = null 
}: DynamicFormProps) {
  const [fileStates, setFileStates] = useState<Record<string, FileUploadState>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const { setToken, getToken } = useTurnstile()
  
  // Generate Zod schema from form definition
  const zodSchema = useMemo(() => {
    try {
      return generateZodSchema(formSchema.fields)
    } catch (err) {
      console.error('Failed to generate schema:', err)
      // Return a minimal schema as fallback
      return generateZodSchema([])
    }
  }, [formSchema.fields])

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    resolver: zodResolver(zodSchema),
    mode: 'onChange',
  })

  const watchedValues = watch()

  // Filter visible fields based on conditional logic
  const visibleFields = useMemo(() => {
    return formSchema.fields.filter((field) => {
      if (!field.conditional) return true
      
      const { field: dependentField, operator, value } = field.conditional
      const dependentValue = watchedValues[dependentField]
      
      switch (operator) {
        case 'equals':
          return dependentValue === value
        case 'not_equals':
          return dependentValue !== value
        case 'contains':
          return typeof dependentValue === 'string' && dependentValue.includes(String(value))
        case 'not_contains':
          return typeof dependentValue === 'string' && !dependentValue.includes(String(value))
        default:
          return true
      }
    })
  }, [formSchema.fields, watchedValues])

  const handleFormSubmit = useCallback(async (data: Record<string, unknown>) => {
    try {
      // Get Turnstile token if required
      const turnstileToken = getToken()
      
      // Validate data
      const validationResult = validateFormDataFromFields(data, formSchema.fields)
      if (!validationResult.success) {
        console.error('Validation failed:', validationResult.error.issues.map(i => i.message))
        return
      }

      await onSubmit(data, turnstileToken || undefined)
    } catch (err) {
      console.error('Form submission failed:', err)
    }
  }, [formSchema.fields, onSubmit, getToken])

  const handleTurnstileSuccess = useCallback((token: string) => {
    setToken(token)
  }, [setToken])

  const renderField = (field: FormFieldDefinition) => {
    const fieldError = errors[field.id]
    const errorMessage = fieldError?.message as string | undefined

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className={`${field.required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}>
          {field.label}
        </Label>
        {field.description && (
          <p className="text-sm text-gray-600">{field.description}</p>
        )}
        
        <Controller
          name={field.id}
          control={control}
          defaultValue={field.defaultValue}
          render={({ field: controllerField }) => {
            switch (field.type) {
              case 'text':
              case 'email':
              case 'phone':
              case 'url':
                return (
                  <Input
                    {...controllerField}
                    type={field.type}
                    placeholder={field.placeholder}
                    className={errorMessage ? 'border-red-500' : ''}
                  />
                )

              case 'textarea':
                return (
                  <Textarea
                    {...controllerField}
                    placeholder={field.placeholder}
                    rows={4}
                    className={errorMessage ? 'border-red-500' : ''}
                  />
                )

              case 'number':
                return (
                  <Input
                    {...controllerField}
                    type="number"
                    placeholder={field.placeholder}
                    className={errorMessage ? 'border-red-500' : ''}
                    onChange={(e) => controllerField.onChange(Number(e.target.value))}
                  />
                )

              case 'date':
                return (
                  <Input
                    {...controllerField}
                    type="date"
                    className={errorMessage ? 'border-red-500' : ''}
                  />
                )

              case 'time':
                return (
                  <Input
                    {...controllerField}
                    type="time"
                    className={errorMessage ? 'border-red-500' : ''}
                  />
                )

              case 'datetime':
                return (
                  <Input
                    {...controllerField}
                    type="datetime-local"
                    className={errorMessage ? 'border-red-500' : ''}
                  />
                )

              case 'select':
                return (
                  <Select 
                    value={controllerField.value || ''} 
                    onValueChange={controllerField.onChange}
                  >
                    <SelectTrigger className={errorMessage ? 'border-red-500' : ''}>
                      <SelectValue placeholder={field.placeholder || 'Select an option'} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )

              case 'radio':
                return (
                  <div className="space-y-2">
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${field.id}-${option.value}`}
                          name={field.id}
                          value={option.value}
                          checked={controllerField.value === option.value}
                          onChange={() => controllerField.onChange(option.value)}
                          className="radio"
                        />
                        <Label htmlFor={`${field.id}-${option.value}`}>
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )

              case 'checkbox':
                return (
                  <div className="space-y-2">
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${field.id}-${option.value}`}
                          checked={Array.isArray(controllerField.value) && controllerField.value.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const current = Array.isArray(controllerField.value) ? controllerField.value : []
                            if (checked) {
                              controllerField.onChange([...current, option.value])
                            } else {
                              controllerField.onChange(current.filter((v: string) => v !== option.value))
                            }
                          }}
                        />
                        <Label htmlFor={`${field.id}-${option.value}`}>
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )

              case 'boolean':
                return (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={!!controllerField.value}
                      onCheckedChange={controllerField.onChange}
                    />
                    <Label htmlFor={field.id}>
                      {field.placeholder || 'Yes'}
                    </Label>
                  </div>
                )

              case 'file':
                return <FileUploadField field={field} onChange={controllerField.onChange} />

              case 'geo':
                return <GeoLocationField field={field} onChange={controllerField.onChange} />

              default:
                return (
                  <div className="p-4 border rounded-md bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Field type &quot;{field.type}&quot; not supported yet
                    </p>
                  </div>
                )
            }
          }}
        />

        {errorMessage && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle size={16} />
            {errorMessage}
          </p>
        )}
      </div>
    )
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="text-lg font-semibold text-green-900">
              Form Submitted Successfully
            </h3>
            <p className="text-gray-600">
              Thank you for your submission. We&apos;ll process your request and get back to you soon.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formSchema.title}</CardTitle>
        {formSchema.description && (
          <p className="text-gray-600">{formSchema.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Form Fields */}
          <div className="space-y-6">
            {visibleFields.map(renderField)}
          </div>

          {/* Turnstile Widget */}
          <div className="py-4">
            <TurnstileWidget
              siteKey={getCurrentTurnstileConfig().siteKey}
              onSuccess={handleTurnstileSuccess}
              onError={() => console.error('Turnstile verification failed')}
              theme="auto"
              size="normal"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || isSubmitting}
            className="w-full"
            size="lg"
          >
            {(loading || isSubmitting) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Form'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// File Upload Field Component
function FileUploadField({ 
  field, 
  onChange 
}: { 
  field: FormFieldDefinition
  onChange: (files: File[]) => void 
}) {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles)
    onChange(newFiles)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFileChange(droppedFiles)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Drop files here or click to upload
        </p>
        <input
          type="file"
          multiple={!field.validation?.max || field.validation.max > 1}
          accept={field.fileConstraints?.allowedTypes.join(',')}
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files || [])
            handleFileChange(selectedFiles)
          }}
          className="hidden"
        />
        <Button type="button" variant="outline" size="sm">
          Choose Files
        </Button>
      </div>
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="text-sm text-gray-600">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Geo Location Field Component
function GeoLocationField({ 
  field, 
  onChange 
}: { 
  field: FormFieldDefinition
  onChange: (location: { lat: number; lng: number } | null) => void 
}) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setLocation(newLocation)
        onChange(newLocation)
        setLoading(false)
      },
      (error) => {
        setError('Failed to get location: ' + error.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={getCurrentLocation}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting location...
          </>
        ) : (
          <>
            <MapPin className="mr-2 h-4 w-4" />
            Get Current Location
          </>
        )}
      </Button>

      {location && (
        <div className="p-3 bg-green-50 rounded-md border border-green-200">
          <p className="text-sm text-green-800">
            📍 Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 rounded-md border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  )
}
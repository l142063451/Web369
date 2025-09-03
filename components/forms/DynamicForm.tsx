/**
 * Dynamic Form Renderer
 * Renders forms dynamically from schema for public users
 * Part of PR07: Form Builder & SLA Engine
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, MapPin, Calendar, Clock } from 'lucide-react'
import { FormSchema, FormFieldDefinition, formToZodSchema, isFieldVisible } from '@/lib/forms/schema'
import { TurnstileWidget } from './TurnstileWidget'
import { useDropzone } from 'react-dropzone'

interface DynamicFormProps {
  schema: FormSchema
  onSubmit: (data: FormSubmissionData) => Promise<void>
  isSubmitting?: boolean
  error?: string | null
  success?: boolean
}

interface FormSubmissionData {
  data: Record<string, unknown>
  turnstileToken: string
  files: File[]
}

export function DynamicForm({ schema, onSubmit, isSubmitting = false, error, success }: DynamicFormProps) {
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [turnstileError, setTurnstileError] = useState<boolean>(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)

  // Generate Zod schema
  const zodSchema = formToZodSchema(schema)

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(zodSchema),
    mode: 'onBlur',
  })

  const watchedValues = watch()

  // Handle form submission
  const handleFormSubmit = useCallback(async (data: Record<string, unknown>) => {
    if (!turnstileToken && process.env.NODE_ENV === 'production') {
      setTurnstileError(true)
      return
    }

    // Collect all files
    const allFiles: File[] = []
    Object.values(uploadedFiles).forEach(files => {
      allFiles.push(...files)
    })

    const submissionData: FormSubmissionData = {
      data,
      turnstileToken,
      files: allFiles,
    }

    await onSubmit(submissionData)
  }, [turnstileToken, uploadedFiles, onSubmit])

  // Handle Turnstile verification
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
    setTurnstileError(false)
  }, [])

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken('')
    setTurnstileError(true)
  }, [])

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setGeoLocation(location)
        setValue('location', location)
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Unable to get your location. Please try again.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [setValue])

  // Reset form after successful submission
  useEffect(() => {
    if (success) {
      reset()
      setTurnstileToken('')
      setUploadedFiles({})
      setGeoLocation(null)
    }
  }, [success, reset])

  // Render individual field
  const renderField = (field: FormFieldDefinition) => {
    const isVisible = isFieldVisible(field, watchedValues)
    if (!isVisible) return null

    const fieldError = errors[field.id]
    const fieldValue = watchedValues[field.id]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <Input
                  {...controllerField}
                  id={field.id}
                  type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                  placeholder={field.placeholder}
                  className={fieldError ? 'border-red-500' : ''}
                />
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <Textarea
                  {...controllerField}
                  id={field.id}
                  placeholder={field.placeholder}
                  rows={4}
                  className={fieldError ? 'border-red-500' : ''}
                />
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <Input
                  {...controllerField}
                  id={field.id}
                  type="number"
                  placeholder={field.placeholder}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  className={fieldError ? 'border-red-500' : ''}
                  onChange={(e) => controllerField.onChange(Number(e.target.value))}
                />
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <Select onValueChange={controllerField.onChange} value={controllerField.value}>
                  <SelectTrigger className={fieldError ? 'border-red-500' : ''}>
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
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${field.id}-${option.value}`}
                        {...controllerField}
                        value={option.value}
                        checked={controllerField.value === option.value}
                        className="text-blue-600"
                      />
                      <Label htmlFor={`${field.id}-${option.value}`} className="font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'checkbox':
        if (field.options?.length) {
          // Multiple checkboxes
          return (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Controller
                name={field.id}
                control={control}
                render={({ field: controllerField }) => (
                  <div className="space-y-2">
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${field.id}-${option.value}`}
                          checked={controllerField.value?.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const current = controllerField.value || []
                            if (checked) {
                              controllerField.onChange([...current, option.value])
                            } else {
                              controllerField.onChange(current.filter((v: string) => v !== option.value))
                            }
                          }}
                        />
                        <Label htmlFor={`${field.id}-${option.value}`} className="font-normal">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              />
              {field.description && (
                <p className="text-sm text-gray-600">{field.description}</p>
              )}
              {fieldError && (
                <p className="text-sm text-red-600">{fieldError.message as string}</p>
              )}
            </div>
          )
        } else {
          // Single checkbox
          return (
            <div key={field.id} className="space-y-2">
              <Controller
                name={field.id}
                control={control}
                render={({ field: controllerField }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={controllerField.value}
                      onCheckedChange={controllerField.onChange}
                    />
                    <Label htmlFor={field.id} className="font-normal">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  </div>
                )}
              />
              {field.description && (
                <p className="text-sm text-gray-600">{field.description}</p>
              )}
              {fieldError && (
                <p className="text-sm text-red-600">{fieldError.message as string}</p>
              )}
            </div>
          )
        }

      case 'boolean':
        return (
          <div key={field.id} className="space-y-2">
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={controllerField.value}
                    onCheckedChange={controllerField.onChange}
                  />
                  <Label htmlFor={field.id} className="font-normal">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                </div>
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <div className="relative">
                  <Input
                    {...controllerField}
                    id={field.id}
                    type="date"
                    className={fieldError ? 'border-red-500' : ''}
                  />
                  <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'time':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Controller
              name={field.id}
              control={control}
              render={({ field: controllerField }) => (
                <div className="relative">
                  <Input
                    {...controllerField}
                    id={field.id}
                    type="time"
                    className={fieldError ? 'border-red-500' : ''}
                  />
                  <Clock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              )}
            />
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      case 'file':
        return <FileUploadField key={field.id} field={field} onFilesChange={(files) => {
          setUploadedFiles(prev => ({ ...prev, [field.id]: files }))
          setValue(field.id, files.map(f => ({ name: f.name, size: f.size, type: f.type })))
        }} error={fieldError?.message as string} />

      case 'geo':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Button
              type="button"
              variant="outline"
              onClick={getCurrentLocation}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {geoLocation ? 'Update Location' : 'Get Current Location'}
            </Button>
            {geoLocation && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                Lat: {geoLocation.lat.toFixed(6)}, Lng: {geoLocation.lng.toFixed(6)}
                {geoLocation.accuracy && (
                  <span className="block">Accuracy: ±{Math.round(geoLocation.accuracy)}m</span>
                )}
              </div>
            )}
            {field.description && (
              <p className="text-sm text-gray-600">{field.description}</p>
            )}
            {fieldError && (
              <p className="text-sm text-red-600">{fieldError.message as string}</p>
            )}
          </div>
        )

      default:
        return (
          <div key={field.id} className="text-sm text-gray-500">
            Unsupported field type: {field.type}
          </div>
        )
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{schema.title}</CardTitle>
        {schema.description && (
          <CardDescription>{schema.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              Your submission has been received successfully. You will be notified of any updates.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {schema.fields.map(renderField)}

          {/* Turnstile Widget */}
          <div className="border-t pt-6">
            <TurnstileWidget
              onVerify={handleTurnstileVerify}
              onError={handleTurnstileError}
              onExpire={() => setTurnstileToken('')}
            />
            {turnstileError && (
              <p className="text-sm text-red-600 mt-2">
                Please complete the security verification.
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || (!turnstileToken && process.env.NODE_ENV === 'production')}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// File Upload Field Component
function FileUploadField({ field, onFilesChange, error }: {
  field: FormFieldDefinition
  onFilesChange: (files: File[]) => void
  error?: string
}) {
  const [files, setFiles] = useState<File[]>([])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: (field.fileConstraints?.maxFiles || 1) > 1,
    maxSize: field.fileConstraints?.maxSize || 5 * 1024 * 1024, // 5MB default
    accept: field.fileConstraints?.allowedTypes?.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles)
      onFilesChange(acceptedFiles)
    },
    onDropRejected: (rejectedFiles) => {
      console.error('File upload rejected:', rejectedFiles)
    },
  })

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${error ? 'border-red-500' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-1">
              Drag & drop files here, or click to select
            </p>
            {field.fileConstraints && (
              <p className="text-xs text-gray-500">
                Max size: {Math.round(field.fileConstraints.maxSize / 1024 / 1024)}MB
                {field.fileConstraints.allowedTypes && (
                  <span> • Types: {field.fileConstraints.allowedTypes.map(type => type.split('/')[1]).join(', ')}</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>
      
      {files.length > 0 && (
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">Selected files:</p>
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li key={index} className="flex justify-between">
                <span>{file.name}</span>
                <span>{Math.round(file.size / 1024)}KB</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
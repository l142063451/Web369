/**
 * Service Request Form Component - PR08
 * Client-side form for service submissions using Form Builder from PR07
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
// import { toast } from 'react-hot-toast' // Temporarily disabled

import type { ServiceType, ServiceCategory } from '@/lib/services/config'
import type { FormFieldDefinition } from '@/lib/forms/schema'
import { validateServiceFormData } from '@/lib/services/service'
import { Button } from '@/components/ui/button'

interface ServiceRequestFormProps {
  serviceType: ServiceType
  serviceConfig: ServiceCategory
  formSchema: FormFieldDefinition[]
}

export default function ServiceRequestForm({ serviceType, serviceConfig, formSchema }: ServiceRequestFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create dynamic Zod schema based on form configuration
  const createZodSchema = (fields: FormFieldDefinition[]) => {
    const schemaObj: Record<string, any> = {}
    
    fields.forEach((field) => {
      let fieldSchema: any
      
      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email()
          break
        case 'phone':
          fieldSchema = z.string().min(10)
          break
        case 'number':
          fieldSchema = z.coerce.number()
          break
        case 'url':
          fieldSchema = z.string().url()
          break
        case 'boolean':
          fieldSchema = z.boolean()
          break
        case 'date':
        case 'datetime':
          fieldSchema = z.string().min(1)
          break
        case 'file':
          fieldSchema = z.any().optional()
          break
        default:
          fieldSchema = z.string()
          break
      }
      
      // Apply validation constraints
      if (field.validation) {
        if (field.validation.minLength && fieldSchema.minLength) {
          fieldSchema = fieldSchema.min(field.validation.minLength)
        }
        if (field.validation.maxLength && fieldSchema.maxLength) {
          fieldSchema = fieldSchema.max(field.validation.maxLength)
        }
        if (field.validation.min && fieldSchema.min) {
          fieldSchema = fieldSchema.min(field.validation.min)
        }
        if (field.validation.max && fieldSchema.max) {
          fieldSchema = fieldSchema.max(field.validation.max)
        }
      }
      
      // Handle required fields
      if (!field.required && field.type !== 'boolean') {
        fieldSchema = fieldSchema.optional()
      }
      
      schemaObj[field.id] = fieldSchema
    })
    
    return z.object(schemaObj)
  }

  const zodSchema = createZodSchema(formSchema)
  type FormData = z.infer<typeof zodSchema>
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<FormData>({
    resolver: zodResolver(zodSchema),
    mode: 'onChange'
  })

  const onSubmit = async (data: FormData) => {
    if (!session) {
      alert('Please sign in to submit a service request')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Validate using service-specific validation
      const validation = validateServiceFormData(serviceType, data)
      
      if (!validation.valid) {
        alert('Please fix the form errors: ' + validation.errors.join(', '))
        return
      }

      // Submit to API
      const response = await fetch('/api/services/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType,
          formData: data
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit request')
      }

      const result = await response.json()
      
      alert('Service request submitted successfully!')
      router.push(`/my-requests?highlight=${result.submissionId}`)
      
    } catch (error) {
      console.error('Submission error:', error)
      alert('Failed to submit service request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Authentication Required
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>You need to sign in to submit a service request. This helps us track your application and send you updates.</p>
                </div>
                <div className="mt-4">
                  <Button 
                    onClick={() => router.push('/auth/signin')}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Sign In to Continue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
      {formSchema.map((field) => (
        <FormField
          key={field.id}
          field={field}
          register={register}
          watch={watch}
          errors={errors}
        />
      ))}

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </form>
  )
}

interface FormFieldProps {
  field: FormFieldDefinition
  register: any
  watch: any
  errors: any
}

function FormField({ field, register, watch, errors }: FormFieldProps) {
  const error = errors[field.id]
  
  // Check conditional logic
  if (field.conditional) {
    const watchedValue = watch(field.conditional.field)
    const shouldShow = field.conditional.operator === 'equals' 
      ? watchedValue === field.conditional.value
      : watchedValue !== field.conditional.value
      
    if (!shouldShow) return null
  }

  return (
    <div className="space-y-2">
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-900">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {field.description && (
        <p className="text-sm text-gray-600">{field.description}</p>
      )}
      
      <div className="mt-1">
        {renderFormControl(field, register)}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  )
}

function renderFormControl(field: FormFieldDefinition, register: any) {
  const baseProps = {
    id: field.id,
    placeholder: field.placeholder,
    ...register(field.id)
  }

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          {...baseProps}
          rows={4}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'select':
      return (
        <select
          {...baseProps}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select an option</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
      
    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                {...register(field.id)}
                type="radio"
                value={option.value}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
      )
      
    case 'checkbox':
      return (
        <div className="flex items-center">
          <input
            {...register(field.id)}
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-900">{field.label}</span>
        </div>
      )
      
    case 'file':
      return (
        <input
          {...baseProps}
          type="file"
          multiple={field.fileConstraints?.maxFiles ? field.fileConstraints.maxFiles > 1 : false}
          accept={field.fileConstraints?.allowedTypes?.join(',') || '*'}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
        />
      )
      
    case 'date':
      return (
        <input
          {...baseProps}
          type="date"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'time':
      return (
        <input
          {...baseProps}
          type="time"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'datetime':
      return (
        <input
          {...baseProps}
          type="datetime-local"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'number':
      return (
        <input
          {...baseProps}
          type="number"
          min={field.validation?.min}
          max={field.validation?.max}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'email':
      return (
        <input
          {...baseProps}
          type="email"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'phone':
      return (
        <input
          {...baseProps}
          type="tel"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'url':
      return (
        <input
          {...baseProps}
          type="url"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
      
    case 'geo':
      return (
        <div className="bg-gray-50 border border-gray-300 rounded-md p-4 text-center text-gray-500">
          Location picker will be implemented
        </div>
      )
      
    case 'boolean':
      return (
        <div className="flex items-center">
          <input
            {...register(field.id)}
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      )
      
    default:
      return (
        <input
          {...baseProps}
          type="text"
          minLength={field.validation?.minLength}
          maxLength={field.validation?.maxLength}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      )
  }
}
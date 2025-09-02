/**
 * Public Form Renderer Client Component
 * Handles form submission and state management
 * Part of PR07: Form Builder & SLA Engine
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DynamicForm } from '@/components/forms/DynamicForm'
import { FormSchema } from '@/lib/forms/schema'

interface FormData {
  id: string
  name: string
  schema: FormSchema
  slaDays: number
  active: boolean
}

interface PublicFormRendererProps {
  form: FormData
}

export function PublicFormRenderer({ form }: PublicFormRendererProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (data: Record<string, unknown>, turnstileToken?: string) => {
    setLoading(true)
    setError(null)

    try {
      // Submit form data
      const response = await fetch(`/api/forms/${form.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          turnstileToken,
          formId: form.id,
          geo: await getCurrentLocation().catch(() => null),
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            referrer: document.referrer || null,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit form')
      }

      const result = await response.json()
      
      if (result.success) {
        setSuccess(true)
        
        // If there's a redirect URL configured, redirect after a delay
        const redirectUrl = form.schema.settings?.redirectUrl
        if (redirectUrl) {
          setTimeout(() => {
            window.location.href = redirectUrl
          }, 3000)
        }
      } else {
        throw new Error(result.message || 'Submission failed')
      }

    } catch (err) {
      console.error('Form submission error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while submitting the form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DynamicForm
      formSchema={form.schema}
      onSubmit={handleSubmit}
      loading={loading}
      success={success}
      error={error}
    />
  )
}

/**
 * Get current geolocation if available
 */
async function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    )
  })
}
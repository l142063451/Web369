/**
 * Form Client Component
 * Client-side wrapper for public form submissions
 * Part of PR07: Form Builder & SLA Engine
 */

'use client'

import { useState } from 'react'
import { DynamicForm } from '@/components/forms/DynamicForm'
import type { FormSchema } from '@/lib/forms/schema'

interface FormClientProps {
  formId: string
  schema: FormSchema
}

interface FormSubmissionData {
  data: Record<string, unknown>
  turnstileToken: string
  files: File[]
}

export function FormClient({ formId, schema }: FormClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (submissionData: FormSubmissionData) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      // TODO: Handle file uploads separately if needed
      
      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: submissionData.data,
          turnstileToken: submissionData.turnstileToken,
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form')
      }

      setSuccess(true)
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' })

    } catch (err) {
      console.error('Form submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit form')
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DynamicForm
      schema={schema}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
      success={success}
    />
  )
}
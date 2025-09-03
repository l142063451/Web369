/**
 * Public Form Page
 * Renders public forms for citizen submissions
 * Part of PR07: Form Builder & SLA Engine
 */

import { notFound } from 'next/navigation'
import { FormClient } from './FormClient'
import { formService } from '@/lib/forms/service'
import type { FormSchema } from '@/lib/forms/schema'

interface FormPageProps {
  params: { id: string; locale: string }
}

export default async function FormPage({ params }: FormPageProps) {
  try {
    const form = await formService.getForm(params.id)
    
    if (!form || !form.active) {
      notFound()
    }

    const schema = form.schema as FormSchema

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <FormClient formId={form.id} schema={schema} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading form:', error)
    notFound()
  }
}

export async function generateMetadata({ params }: FormPageProps) {
  try {
    const form = await formService.getForm(params.id)
    
    if (!form || !form.active) {
      return {
        title: 'Form Not Found',
      }
    }

    const schema = form.schema as FormSchema

    return {
      title: schema.title,
      description: schema.description,
    }
  } catch (error) {
    return {
      title: 'Form Not Found',
    }
  }
}
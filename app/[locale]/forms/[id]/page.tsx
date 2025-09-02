/**
 * Public Form Page
 * Renders forms for public access using dynamic form renderer
 * Part of PR07: Form Builder & SLA Engine
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { formService } from '@/lib/forms/service'
import { PublicFormRenderer } from './PublicFormRenderer'

interface FormPageProps {
  params: {
    locale: string
    id: string
  }
}

export async function generateMetadata({ params }: FormPageProps): Promise<Metadata> {
  try {
    const form = await formService.getFormById(params.id)
    
    if (!form || !form.active) {
      return {
        title: 'Form Not Found',
      }
    }

    const formSchema = form.schema as { title?: string; description?: string }
    
    return {
      title: formSchema.title || form.name,
      description: formSchema.description || `Submit ${form.name}`,
      robots: 'index, follow',
      openGraph: {
        title: formSchema.title || form.name,
        description: formSchema.description || `Submit ${form.name}`,
        type: 'website',
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Form',
    }
  }
}

export default async function FormPage({ params }: FormPageProps) {
  try {
    const form = await formService.getFormById(params.id)
    
    if (!form || !form.active) {
      notFound()
    }

    // Check if form allows anonymous access
    const formSchema = form.schema as {
      settings?: {
        allowAnonymous?: boolean
        requiresAuth?: boolean
      }
    }

    // For now, allow anonymous access if configured
    // In a full implementation, you'd check authentication here
    if (formSchema.settings?.requiresAuth && !formSchema.settings?.allowAnonymous) {
      // Redirect to auth or show auth required message
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600 mb-6">
              You must be signed in to access this form.
            </p>
            <a
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<FormSkeleton />}>
            <PublicFormRenderer form={form} />
          </Suspense>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading form:', error)
    notFound()
  }
}

function FormSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        
        {/* Fields skeleton */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
        ))}
        
        {/* Button skeleton */}
        <div className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
      </div>
    </div>
  )
}
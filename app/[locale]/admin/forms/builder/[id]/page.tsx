/**
 * Form Builder Page
 * Individual form builder interface
 * Part of PR07: Form Builder & SLA Engine
 */

import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { FormBuilder } from '@/components/admin/forms/FormBuilder'

interface PageProps {
  params: {
    id: string
    locale: string
  }
}

async function FormBuilderContent({ formId }: { formId: string }) {
  // In a real implementation, this would fetch the form from the API
  let initialSchema = undefined
  
  if (formId !== 'new') {
    // try {
    //   const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/forms/${formId}`)
    //   if (response.ok) {
    //     const { data } = await response.json()
    //     initialSchema = data.schema
    //   } else if (response.status === 404) {
    //     notFound()
    //   }
    // } catch (error) {
    //   console.error('Error fetching form:', error)
    //   notFound()
    // }
  }

  const handleSave = async (schema: any) => {
    console.log('Saving form schema:', schema)
    // Here would be the API call to save the form
    // await fetch(`/api/admin/forms${formId !== 'new' ? `/${formId}` : ''}`, {
    //   method: formId === 'new' ? 'POST' : 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ schema })
    // })
  }

  const handlePreview = async (schema: any) => {
    console.log('Previewing form schema:', schema)
    // Here could open a preview modal or navigate to preview page
  }

  return (
    <FormBuilder
      initialSchema={initialSchema}
      onSave={handleSave}
      onPreview={handlePreview}
    />
  )
}

export default async function FormBuilderPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Check if user has permission to create/edit forms
  const action = params.id === 'new' ? 'create' : 'update'
  const hasPermission = await checkPermission(session.user.id, 'forms', action)
  if (!hasPermission) {
    redirect('/admin/forms')
  }

  return (
    <div className="h-screen">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading form builder...</div>
        </div>
      }>
        <FormBuilderContent formId={params.id} />
      </Suspense>
    </div>
  )
}
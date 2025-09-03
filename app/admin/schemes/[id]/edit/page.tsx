'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SchemeEditor } from '@/components/schemes/SchemeEditor'

interface Scheme {
  id: string
  title: string
  category: string
  criteria: unknown
  docsRequired: string[]
  processSteps: string[]
  links: string[]
  active: boolean
}

export default function EditSchemePage() {
  const params = useParams()
  const router = useRouter()
  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchScheme(params.id as string)
    }
  }, [params.id])

  const fetchScheme = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/schemes/${id}`)
      const data = await response.json()
      
      if (response.ok) {
        setScheme(data.scheme)
      } else {
        console.error('Failed to fetch scheme:', data.error)
      }
    } catch (error) {
      console.error('Error fetching scheme:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/schemes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/admin/schemes')
      } else {
        const error = await response.json()
        console.error('Failed to update scheme:', error)
        throw new Error(error.error || 'Failed to update scheme')
      }
    } catch (error) {
      console.error('Error updating scheme:', error)
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/admin/schemes')
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="bg-gray-100 rounded-lg p-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!scheme) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Scheme Not Found</h1>
          <p className="text-gray-600 mb-6">
            The scheme you are trying to edit does not exist or has been removed.
          </p>
          <button
            onClick={() => router.push('/admin/schemes')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to Schemes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <SchemeEditor
        mode="edit"
        initialData={scheme}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}
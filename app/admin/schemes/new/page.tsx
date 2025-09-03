'use client'

import { useRouter } from 'next/navigation'
import { SchemeEditor } from '@/components/schemes/SchemeEditor'

export default function NewSchemePage() {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/schemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/admin/schemes')
      } else {
        const error = await response.json()
        console.error('Failed to create scheme:', error)
        throw new Error(error.error || 'Failed to create scheme')
      }
    } catch (error) {
      console.error('Error creating scheme:', error)
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/admin/schemes')
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <SchemeEditor
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}
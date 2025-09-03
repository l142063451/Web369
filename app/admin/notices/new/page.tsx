/**
 * Create Notice Page
 * PR12 - News/Notices/Events - Admin Interface for Creating Notices
 */

import { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NoticeEditor } from '@/components/admin/notices/NoticeEditor'

export const metadata: Metadata = {
  title: 'Create Notice - Admin | Ummid Se Hari',
  description: 'Create a new official notice with deadline and attachments',
}

export default function NewNoticePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/notices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notices
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Notice</h1>
          <p className="mt-2 text-gray-600">
            Create an official notice with optional deadline and attachments
          </p>
        </div>
      </div>

      {/* Editor */}
      <NoticeEditor mode="create" />
    </div>
  )
}
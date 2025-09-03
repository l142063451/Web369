/**
 * Create News Article Page
 * PR12 - News/Notices/Events - Admin Interface for Creating News
 */

import { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NewsEditor } from '@/components/admin/news/NewsEditor'

export const metadata: Metadata = {
  title: 'Create News Article - Admin | Ummid Se Hari',
  description: 'Create a new news article or announcement',
}

export default function NewNewsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/news">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create News Article</h1>
          <p className="mt-2 text-gray-600">
            Write a new article or announcement for your community
          </p>
        </div>
      </div>

      {/* Editor */}
      <NewsEditor mode="create" />
    </div>
  )
}
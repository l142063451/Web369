import { Suspense } from 'react'
import { ContentManagerView } from '@/components/admin/ContentManagerView'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const metadata = {
  title: 'Content Manager - Admin Panel',
  description: 'Manage pages, sections, and content blocks',
}

export default function ContentManagerPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Content Manager</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create, edit, and manage website pages, sections, and content blocks. Content can be previewed and published with versioning support.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Suspense fallback={<LoadingSpinner />}>
          <ContentManagerView />
        </Suspense>
      </div>
    </div>
  )
}
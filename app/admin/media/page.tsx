import { Suspense } from 'react'
import { MediaLibraryView } from '@/components/admin/MediaLibraryView'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const metadata = {
  title: 'Media Library - Admin Panel',
  description: 'Manage images, documents, and media files',
}

export default function MediaLibraryPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Media Library</h1>
          <p className="mt-2 text-sm text-gray-700">
            Upload, organize, and manage media files. All files are scanned for security before being made available.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Suspense fallback={<LoadingSpinner />}>
          <MediaLibraryView />
        </Suspense>
      </div>
    </div>
  )
}
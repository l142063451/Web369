/**
 * Edit Notice Page
 * PR12 - News/Notices/Events - Admin Interface for Editing Notices
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NoticeEditor } from '@/components/admin/notices/NoticeEditor'
import { NoticesService } from '@/lib/news-events'

interface EditNoticePageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: EditNoticePageProps): Promise<Metadata> {
  const notice = await NoticesService.getById(params.id)
  
  return {
    title: `Edit ${notice?.title || 'Notice'} - Admin | Ummid Se Hari`,
    description: `Edit notice: ${notice?.title || 'Unknown notice'}`,
  }
}

export default async function EditNoticePage({ params }: EditNoticePageProps) {
  const notice = await NoticesService.getById(params.id)

  if (!notice) {
    notFound()
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Edit Notice</h1>
          <p className="mt-2 text-gray-600">
            Update &ldquo;{notice.title}&rdquo;
          </p>
        </div>
      </div>

      {/* Editor */}
      <NoticeEditor mode="edit" notice={notice} />
    </div>
  )
}
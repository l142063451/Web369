/**
 * Edit News Article Page
 * PR12 - News/Notices/Events - Admin Interface for Editing News
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NewsEditor } from '@/components/admin/news/NewsEditor'
import { NewsService } from '@/lib/news-events'

interface EditNewsPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: EditNewsPageProps): Promise<Metadata> {
  const news = await NewsService.getById(params.id)
  
  return {
    title: `Edit ${news?.title || 'News Article'} - Admin | Ummid Se Hari`,
    description: `Edit news article: ${news?.title || 'Unknown article'}`,
  }
}

export default async function EditNewsPage({ params }: EditNewsPageProps) {
  const news = await NewsService.getById(params.id)

  if (!news) {
    notFound()
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Edit News Article</h1>
          <p className="mt-2 text-gray-600">
            Update &ldquo;{news.title}&rdquo;
          </p>
        </div>
      </div>

      {/* Editor */}
      <NewsEditor mode="edit" news={news} />
    </div>
  )
}
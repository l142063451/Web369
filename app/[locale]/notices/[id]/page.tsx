/**
 * Notice Detail Page - /notices/[id]
 * Individual notice page with PDF viewer support
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { NoticesService } from '@/lib/news-events'
import { PDFViewer } from '../_components/PDFViewer'

interface NoticeDetailPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: NoticeDetailPageProps): Promise<Metadata> {
  const notice = await NoticesService.getById(params.id)
  
  if (!notice) {
    return {
      title: 'Notice Not Found | Ummid Se Hari'
    }
  }

  return {
    title: `${notice.title} | Ummid Se Hari`,
    description: notice.body.substring(0, 160),
    openGraph: {
      title: notice.title,
      description: notice.body.substring(0, 160),
      type: 'article',
    }
  }
}

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const notice = await NoticesService.getById(params.id)

  if (!notice) {
    notFound()
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  const isExpired = notice.deadline && new Date(notice.deadline) < new Date()
  const isUrgent = notice.deadline && new Date(notice.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  const pdfAttachments = NoticesService.getPDFAttachments(notice)
  const otherAttachments = NoticesService.getNonPDFAttachments(notice)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span>/</span>
          <Link href="/notices" className="hover:text-green-600">Notices</Link>
          <span>/</span>
          <span className="text-gray-900">{notice.title}</span>
        </nav>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {notice.category}
              </span>
              {isExpired && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Expired
                </span>
              )}
              {!isExpired && isUrgent && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  Urgent
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {notice.title}
            </h1>

            {/* Metadata */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-6 mb-8">
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Posted: {formatDate(notice.createdAt)}</span>
                </div>
                
                {notice.deadline && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`font-medium ${isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-700'}`}>
                      Deadline: {formatDate(notice.deadline)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-links:text-green-600"
              dangerouslySetInnerHTML={{ __html: notice.body }}
            />
          </div>

          {/* PDF Attachments */}
          {pdfAttachments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Documents</h2>
              {pdfAttachments.map((url, index) => (
                <div key={index} className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      PDF Document {pdfAttachments.length > 1 ? `(${index + 1})` : ''}
                    </h3>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </a>
                  </div>
                  <PDFViewer url={url} />
                </div>
              ))}
            </div>
          )}

          {/* Other Attachments */}
          {otherAttachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Other Attachments</h2>
              <div className="space-y-2">
                {otherAttachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Attachment {index + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              href="/notices"
              className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Notices
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
/**
 * NoticeCard Component
 * Displays a notice card with PDF preview and deadline information
 */

import Link from 'next/link'
import { type Notice } from '@/lib/news-events'

interface NoticeCardProps {
  notice: Notice
}

export function NoticeCard({ notice }: NoticeCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  const isExpired = notice.deadline && new Date(notice.deadline) < new Date()
  const isUrgent = notice.deadline && new Date(notice.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days

  const pdfAttachments = notice.attachments.filter(url => url.toLowerCase().endsWith('.pdf'))
  const otherAttachments = notice.attachments.filter(url => !url.toLowerCase().endsWith('.pdf'))

  return (
    <article className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {notice.category}
            </span>
            {isExpired && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Expired
              </span>
            )}
            {!isExpired && isUrgent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Urgent
              </span>
            )}
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
            <Link 
              href={`/notices/${notice.id}`}
              className="hover:text-green-700 transition-colors"
            >
              {notice.title}
            </Link>
          </h3>
        </div>

        {/* Date */}
        <div className="text-sm text-gray-500 text-right ml-4">
          <div>Posted</div>
          <div className="font-medium">{formatDate(notice.createdAt)}</div>
        </div>
      </div>

      {/* Body Preview */}
      <div className="prose prose-sm max-w-none mb-4">
        <div 
          className="text-gray-600 line-clamp-3"
          dangerouslySetInnerHTML={{ 
            __html: notice.body.length > 200 
              ? notice.body.substring(0, 200) + '...' 
              : notice.body 
          }}
        />
      </div>

      {/* Deadline */}
      {notice.deadline && (
        <div className="flex items-center space-x-2 mb-4 text-sm">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`font-medium ${isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-700'}`}>
            Deadline: {formatDate(notice.deadline)}
          </span>
        </div>
      )}

      {/* Attachments */}
      {notice.attachments.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Attachments:</div>
          <div className="space-y-1">
            {pdfAttachments.map((url, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  PDF Document {pdfAttachments.length > 1 ? `(${index + 1})` : ''}
                </a>
              </div>
            ))}
            {otherAttachments.map((url, index) => (
              <div key={`other-${index}`} className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Attachment {otherAttachments.length > 1 ? `(${index + 1})` : ''}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Link
          href={`/notices/${notice.id}`}
          className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center space-x-1 transition-colors"
        >
          <span>Read Full Notice</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>Category: {notice.category}</span>
        </div>
      </div>
    </article>
  )
}
/**
 * Admin News Management Page
 * PR12 - News/Notices/Events - Admin Interface for News
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, FileText, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { NewsService } from '@/lib/news-events'

export default async function AdminNewsPage() {
  // Get news articles with all statuses for admin view
  const { news, pagination } = await NewsService.list({
    status: undefined, // Show all statuses
    page: 1,
    limit: 20
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">News Management</h1>
          <p className="mt-2 text-gray-600">
            Create and manage news articles and announcements
          </p>
        </div>
        <Link href="/admin/news/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{news.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-green-600">
                {news.filter(n => n.status === 'PUBLISHED').length}
              </p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-yellow-600">
                {news.filter(n => n.status === 'DRAFT').length}
              </p>
            </div>
            <Edit className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Staged</p>
              <p className="text-2xl font-bold text-blue-600">
                {news.filter(n => n.status === 'STAGED').length}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Articles</h2>
        </div>
        
        <Suspense fallback={<Loading />}>
          <div className="divide-y">
            {news.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No news articles</h3>
                <p className="mt-2 text-gray-500">
                  Get started by creating your first news article.
                </p>
                <Link href="/admin/news/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Article
                  </Button>
                </Link>
              </div>
            ) : (
              news.map((article) => (
                <div key={article.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {article.title}
                        </h3>
                        <Badge 
                          variant={
                            article.status === 'PUBLISHED' ? 'default' : 
                            article.status === 'STAGED' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {article.status}
                        </Badge>
                      </div>
                      
                      {article.excerpt && (
                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Created: {new Date(article.createdAt).toLocaleDateString()}</span>
                        {article.publishedAt && (
                          <span>Published: {new Date(article.publishedAt).toLocaleDateString()}</span>
                        )}
                        {article.tags.length > 0 && (
                          <div className="flex gap-1">
                            {article.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {article.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{article.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {article.status === 'PUBLISHED' && (
                        <Link href={`/news/${article.slug}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Link href={`/admin/news/${article.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Suspense>
      </div>
    </div>
  )
}
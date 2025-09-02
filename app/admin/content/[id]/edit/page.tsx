/**
 * Admin Page Editor
 * Route: /admin/content/[id]/edit
 */

import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { ContentService } from '@/lib/content/service'
import { PageEditor } from '@/components/admin/content/PageEditor'

interface PageEditorPageProps {
  params: { id: string }
}

export default async function PageEditorPage({ params }: PageEditorPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return notFound()
  }
  
  // Check permissions
  if (!(await hasPermission(session.user.id, 'content:edit'))) {
    return notFound()
  }
  
  // Get page data
  const page = await ContentService.getPageById(params.id)
  
  if (!page) {
    return notFound()
  }
  
  return (
    <div className="max-w-none">
      <PageEditor page={page} />
    </div>
  )
}
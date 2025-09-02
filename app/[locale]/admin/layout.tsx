import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin, requiresTwoFA } from '@/lib/rbac/permissions'
import { AdminNavigation } from '@/components/admin/AdminNavigation'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel - Ummid Se Hari',
  description: 'Administrative interface for village management system',
  robots: 'noindex, nofollow',
}

async function checkAdminAccess(userId: string) {
  const hasAccess = await canAccessAdmin(userId)
  if (!hasAccess) {
    redirect('/auth/signin?callbackUrl=/admin&error=insufficient_permissions')
  }

  const needs2FA = await requiresTwoFA(userId)
  if (needs2FA) {
    // Check if 2FA is verified (this would be set in session after 2FA verification)
    // For now, we'll assume 2FA check is handled in middleware
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin')
  }

  // Check admin access permissions
  await checkAdminAccess(session.user.id)

  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full">
        <div className="min-h-full">
          {/* Admin Header */}
          <AdminHeader user={session.user} />

          <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar Navigation */}
            <div className="hidden md:flex md:w-64 md:flex-col">
              <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 bg-white overflow-y-auto">
                <Suspense fallback={<LoadingSpinner />}>
                  <AdminNavigation />
                </Suspense>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <main className="flex-1 relative overflow-y-auto focus:outline-none">
                <div className="py-6">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                    <Suspense fallback={<LoadingSpinner />}>
                      {children}
                    </Suspense>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
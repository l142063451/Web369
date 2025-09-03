/**
 * Security & Accessibility Admin Page
 * 
 * Main security dashboard for monitoring and managing security features
 * Part of PR16 implementation
 */

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/authOptions'
import SecurityDashboard from '@/components/admin/security/SecurityDashboard'

export const metadata = {
  title: 'Security & Accessibility - Admin',
  description: 'Security monitoring and accessibility compliance dashboard',
}

export default async function SecurityAdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/admin/login')
  }

  // Check if user has admin permissions  
  const userRoles = session.user.roles || []
  const isAdmin = Array.isArray(userRoles) && userRoles.some((role: any) => 
    typeof role === 'string' ? role === 'Admin' : role.name === 'Admin'
  )
  
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-gray-600">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    )
  }

  return (
    <main id="main-content" className="container mx-auto px-4 py-8">
      <SecurityDashboard />
    </main>
  )
}
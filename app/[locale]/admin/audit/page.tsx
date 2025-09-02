import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/rbac/permissions'
import { redirect } from 'next/navigation'
import { AuditLogsView } from '@/components/admin/AuditLogsView'

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin/audit')
  }

  const canViewAudit = await hasPermission(session.user.id, 'system:audit')
  if (!canViewAudit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-gray-600">
          You don&apos;t have permission to view audit logs.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-600">
          View system activity and changes made by administrators
        </p>
      </div>

      <AuditLogsView />
    </div>
  )
}
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { getUserRoles } from '@/lib/rbac/permissions'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return <div>Unauthorized</div>
  }

  const userRoles = await getUserRoles(session.user.id)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to the Ummid Se Hari administrative interface
        </p>
      </div>

      <AdminDashboard userRoles={userRoles} />
    </div>
  )
}
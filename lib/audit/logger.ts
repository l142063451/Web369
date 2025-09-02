import { prisma } from '@/lib/db'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'UNPUBLISH'
  | 'ASSIGN_ROLE'
  | 'REMOVE_ROLE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ENABLE_2FA'
  | 'DISABLE_2FA'
  | 'PASSWORD_CHANGE'
  | 'APPROVE'
  | 'REJECT'
  | 'MODERATE'
  | 'IMPORT'

export interface AuditLogData {
  actorId: string
  action: AuditAction
  resource: string
  resourceId: string
  diff?: Record<string, any>
  metadata?: Record<string, any>
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        diff: data.diff || {},
        metadata: data.metadata || {},
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Create an audit log for create operations
 */
export async function auditCreate(
  actorId: string,
  resource: string,
  resourceId: string,
  data: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    actorId,
    action: 'CREATE',
    resource,
    resourceId,
    diff: { created: data },
    metadata,
  })
}

/**
 * Create an audit log for update operations
 */
export async function auditUpdate(
  actorId: string,
  resource: string,
  resourceId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  const diff: Record<string, any> = {}
  
  // Calculate changes
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      diff[key] = {
        from: oldData[key],
        to: newData[key],
      }
    }
  }

  // Check for removed fields
  for (const key in oldData) {
    if (!(key in newData)) {
      diff[key] = {
        from: oldData[key],
        to: null,
      }
    }
  }

  if (Object.keys(diff).length > 0) {
    await createAuditLog({
      actorId,
      action: 'UPDATE',
      resource,
      resourceId,
      diff,
      metadata,
    })
  }
}

/**
 * Create an audit log for delete operations
 */
export async function auditDelete(
  actorId: string,
  resource: string,
  resourceId: string,
  data: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    actorId,
    action: 'DELETE',
    resource,
    resourceId,
    diff: { deleted: data },
    metadata,
  })
}

/**
 * Create an audit log for role assignment
 */
export async function auditRoleAssignment(
  actorId: string,
  targetUserId: string,
  roleName: string,
  assigned: boolean,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    actorId,
    action: assigned ? 'ASSIGN_ROLE' : 'REMOVE_ROLE',
    resource: 'user_role',
    resourceId: targetUserId,
    diff: {
      roleName,
      assigned,
    },
    metadata,
  })
}

/**
 * Create an audit log for authentication events
 */
export async function auditAuth(
  actorId: string,
  action: 'LOGIN' | 'LOGOUT',
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    actorId,
    action,
    resource: 'auth_session',
    resourceId: actorId,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  })
}

/**
 * Create an audit log for moderation actions
 */
export async function auditModeration(
  actorId: string,
  action: 'APPROVE' | 'REJECT' | 'MODERATE',
  resource: string,
  resourceId: string,
  reason?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    actorId,
    action,
    resource,
    resourceId,
    diff: {
      moderationAction: action.toLowerCase(),
      reason,
    },
    metadata,
  })
}

/**
 * Get recent audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resource: string,
  resourceId: string,
  limit: number = 10
) {
  return await prisma.auditLog.findMany({
    where: {
      resource,
      resourceId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

/**
 * Get audit statistics
 */
export async function getAuditStats() {
  const totalLogs = await prisma.auditLog.count()
  
  const actionStats = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: {
      action: true,
    },
    orderBy: {
      _count: {
        action: 'desc',
      },
    },
  })

  const resourceStats = await prisma.auditLog.groupBy({
    by: ['resource'],
    _count: {
      resource: true,
    },
    orderBy: {
      _count: {
        resource: 'desc',
      },
    },
    take: 10,
  })

  const recentActivity = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
    include: {
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  return {
    totalLogs,
    actionStats,
    resourceStats,
    recentActivity,
  }
}
import { prisma } from '@/lib/db'

// Define all possible permissions
export const PERMISSIONS = {
  // Content Management
  'content:read': 'Read content',
  'content:create': 'Create content',
  'content:edit': 'Edit content',
  'content:delete': 'Delete content',
  'content:publish': 'Publish content',
  
  // Media Management
  'media:read': 'View media',
  'media:upload': 'Upload media',
  'media:delete': 'Delete media',
  
  // Form Management
  'forms:read': 'View forms',
  'forms:create': 'Create forms',
  'forms:edit': 'Edit forms',
  'forms:delete': 'Delete forms',
  
  // Submission Management
  'submissions:read': 'View submissions',
  'submissions:assign': 'Assign submissions',
  'submissions:resolve': 'Resolve submissions',
  'submissions:export': 'Export submissions',
  
  // Project Management
  'projects:read': 'View projects',
  'projects:create': 'Create projects',
  'projects:edit': 'Edit projects',
  'projects:delete': 'Delete projects',
  'projects:publish': 'Publish projects',
  
  // Directory Management
  'directory:read': 'View directory entries',
  'directory:write': 'Create/edit directory entries',
  'directory:delete': 'Delete directory entries',
  'directory:approve': 'Approve directory entries',
  
  // User Management
  'users:read': 'View users',
  'users:create': 'Create users',
  'users:edit': 'Edit users',
  'users:delete': 'Delete users',
  'users:manage_roles': 'Manage user roles',
  'users:enforce_2fa': 'Enforce 2FA',
  
  // System Management
  'system:settings': 'Manage system settings',
  'system:translations': 'Manage translations',
  'system:notifications': 'Send notifications',
  'system:analytics': 'View analytics',
  'system:audit': 'View audit logs',
  'system:backup': 'Manage backups',
  
  // Moderation
  'moderate:content': 'Moderate content',
  'moderate:comments': 'Moderate comments',
  'moderate:directory': 'Moderate directory entries',
  'moderate:pledges': 'Moderate pledges',
  
  // Admin Panel Access
  'admin:access': 'Access admin panel',
} as const

export type Permission = keyof typeof PERMISSIONS

// Define default role permissions
export const DEFAULT_ROLES = {
  admin: Object.keys(PERMISSIONS) as Permission[],
  editor: [
    'content:read',
    'content:create', 
    'content:edit',
    'content:publish',
    'media:read',
    'media:upload',
    'forms:read',
    'forms:create',
    'forms:edit',
    'submissions:read',
    'submissions:assign',
    'submissions:resolve',
    'projects:read',
    'projects:create',
    'projects:edit',
    'directory:read',
    'directory:write',
    'system:translations',
    'moderate:content',
    'admin:access',
  ] as Permission[],
  approver: [
    'content:read',
    'content:publish',
    'submissions:read',
    'submissions:resolve',
    'projects:read',
    'projects:publish',
    'directory:read',
    'directory:approve',
    'moderate:content',
    'moderate:comments',
    'moderate:directory',
    'moderate:pledges',
    'admin:access',
  ] as Permission[],
  dataentry: [
    'content:read',
    'content:create',
    'media:read',
    'media:upload',
    'projects:read',
    'projects:create',
    'projects:edit',
    'submissions:read',
    'admin:access',
  ] as Permission[],
  viewer: [
    'content:read',
    'media:read',
    'forms:read',
    'submissions:read',
    'projects:read',
    'admin:access',
  ] as Permission[],
  citizen: [
    'content:read',
    'media:read',
  ] as Permission[],
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        select: { name: true }
      }
    }
  })
  
  return userRoles.map((ur: { role: { name: string } }) => ur.role.name)
}

/**
 * Get user permissions
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        select: { name: true, permissions: true }
      }
    }
  })
  
  const permissions = new Set<Permission>()
  
  userRoles.forEach((userRole: { role: { name: string; permissions: any } }) => {
    const rolePermissions = userRole.role.permissions as Permission[]
    rolePermissions.forEach(permission => permissions.add(permission))
  })
  
  return Array.from(permissions)
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return userPermissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return permissions.some(permission => userPermissions.includes(permission))
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return permissions.every(permission => userPermissions.includes(permission))
}

/**
 * Check if user has specific role
 */
export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const roles = await getUserRoles(userId)
  return roles.includes(roleName)
}

/**
 * Check if user can access admin panel
 */
export async function canAccessAdmin(userId: string): Promise<boolean> {
  return await hasPermission(userId, 'admin:access')
}

/**
 * Generic permission checker - maps resource.action to permission
 */
export async function checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
  const permission = `${resource}:${action}` as Permission
  return await hasPermission(userId, permission)
}

/**
 * Assign role to user
 */
export async function assignRole(userId: string, roleName: string, assignedBy: string): Promise<boolean> {
  try {
    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    })
    
    if (!role) {
      throw new Error(`Role ${roleName} not found`)
    }
    
    // Check if user already has the role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id
        }
      }
    })
    
    if (existingUserRole) {
      return true // Already has role
    }
    
    // Assign the role
    await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
      }
    })
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: assignedBy,
        action: 'ASSIGN_ROLE',
        resource: 'user_role',
        resourceId: userId,
        diff: { 
          roleName,
          assigned: true 
        },
      },
    })
    
    return true
  } catch (error) {
    console.error('Failed to assign role:', error)
    return false
  }
}

/**
 * Remove role from user
 */
export async function removeRole(userId: string, roleName: string, removedBy: string): Promise<boolean> {
  try {
    // Find the role and user role relationship
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    })
    
    if (!role) {
      throw new Error(`Role ${roleName} not found`)
    }
    
    const userRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id
        }
      }
    })
    
    if (!userRole) {
      return true // User doesn't have the role
    }
    
    // Remove the role
    await prisma.userRole.delete({
      where: {
        id: userRole.id
      }
    })
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: removedBy,
        action: 'REMOVE_ROLE',
        resource: 'user_role',
        resourceId: userId,
        diff: { 
          roleName,
          removed: true 
        },
      },
    })
    
    return true
  } catch (error) {
    console.error('Failed to remove role:', error)
    return false
  }
}

/**
 * Initialize default roles in database
 */
export async function initializeDefaultRoles(): Promise<void> {
  try {
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLES)) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: { 
          permissions: permissions,
          updatedAt: new Date()
        },
        create: {
          name: roleName,
          permissions: permissions,
        },
      })
    }
    
    console.log('Default roles initialized successfully')
  } catch (error) {
    console.error('Failed to initialize default roles:', error)
    throw error
  }
}

/**
 * Check if user requires 2FA verification
 */
export async function requiresTwoFA(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      twoFAEnabled: true,
      roles: {
        include: {
          role: {
            select: { name: true }
          }
        }
      }
    }
  })

  if (!user) return false

  // If user has 2FA enabled, always require it
  if (user.twoFAEnabled) return true

  // Check if user has admin role and 2FA enforcement is enabled
  const hasAdminRole = user.roles.some((userRole: any) => 
    ['admin', 'editor'].includes(userRole.role.name.toLowerCase())
  )

  // Get 2FA enforcement setting
  const enforcementSetting = await prisma.setting.findUnique({
    where: { key: 'enforce_2fa_for_admins' }
  })

  const enforce2FA = enforcementSetting?.value as boolean ?? true

  return hasAdminRole && enforce2FA
}
import { createAuditLog, auditCreate, auditUpdate, auditDelete } from '@/lib/audit/logger'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}))

describe('Audit Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create an audit log entry', async () => {
    const { prisma } = require('@/lib/db')
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' })

    await createAuditLog({
      actorId: 'user-1',
      action: 'CREATE',
      resource: 'page',
      resourceId: 'page-1',
      diff: { title: 'New Page' },
    })

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'CREATE',
        resource: 'page',
        resourceId: 'page-1',
        diff: { title: 'New Page' },
        metadata: {},
      },
    })
  })

  it('should audit create operations', async () => {
    const { prisma } = require('@/lib/db')
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' })

    await auditCreate('user-1', 'page', 'page-1', { title: 'New Page', content: 'Content' })

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'CREATE',
        resource: 'page',
        resourceId: 'page-1',
        diff: { created: { title: 'New Page', content: 'Content' } },
        metadata: {},
      },
    })
  })

  it('should audit update operations with diff', async () => {
    const { prisma } = require('@/lib/db')
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' })

    const oldData = { title: 'Old Title', content: 'Old Content' }
    const newData = { title: 'New Title', content: 'Old Content' }

    await auditUpdate('user-1', 'page', 'page-1', oldData, newData)

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'UPDATE',
        resource: 'page',
        resourceId: 'page-1',
        diff: {
          title: {
            from: 'Old Title',
            to: 'New Title',
          },
        },
        metadata: {},
      },
    })
  })

  it('should not create audit log for update with no changes', async () => {
    const { prisma } = require('@/lib/db')
    
    const oldData = { title: 'Same Title', content: 'Same Content' }
    const newData = { title: 'Same Title', content: 'Same Content' }

    await auditUpdate('user-1', 'page', 'page-1', oldData, newData)

    expect(prisma.auditLog.create).not.toHaveBeenCalled()
  })

  it('should audit delete operations', async () => {
    const { prisma } = require('@/lib/db')
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' })

    await auditDelete('user-1', 'page', 'page-1', { title: 'Deleted Page' })

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'DELETE',
        resource: 'page',
        resourceId: 'page-1',
        diff: { deleted: { title: 'Deleted Page' } },
        metadata: {},
      },
    })
  })

  it('should handle errors gracefully', async () => {
    const { prisma } = require('@/lib/db')
    prisma.auditLog.create.mockRejectedValue(new Error('Database error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await createAuditLog({
      actorId: 'user-1',
      action: 'CREATE',
      resource: 'page',
      resourceId: 'page-1',
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to create audit log:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})
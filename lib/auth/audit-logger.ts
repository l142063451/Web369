// Bridge file to maintain backward compatibility with existing imports
export * from '@/lib/audit/logger'

// Create a convenience export for the most common use case
import { createAuditLog } from '@/lib/audit/logger'
export const auditLogger = {
  log: createAuditLog
}
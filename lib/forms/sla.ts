/**
 * SLA Engine
 * Calculates SLAs and manages escalation workflows
 * Part of PR07: Form Builder & SLA Engine
 */

import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/auth/audit-logger'
import { formService, Submission, SubmissionStatus } from './service'

export interface SlaConfig {
  category: string
  slaDays: number
  escalationLevels: Array<{
    hours: number // Hours after SLA breach
    action: 'notify' | 'escalate' | 'auto_close'
    recipients: string[] // User IDs or roles
    template?: string // Email template
  }>
  businessHours?: {
    enabled: boolean
    startHour: number // 0-23
    endHour: number // 0-23
    weekdays: number[] // 0-6, Sunday = 0
  }
}

export interface SlaCalculationResult {
  slaDue: Date
  isOverdue: boolean
  hoursRemaining: number
  severity: 'normal' | 'warning' | 'critical' | 'overdue'
}

export interface EscalationAction {
  submissionId: string
  level: number
  action: string
  scheduledFor: Date
  completed: boolean
  result?: string
}

/**
 * SLA Engine Class
 */
export class SlaEngine {
  constructor(private db: PrismaClient = prisma) {}

  /**
   * Calculate SLA due date for a submission
   */
  calculateSlaDue(
    createdAt: Date,
    slaDays: number,
    config?: SlaConfig
  ): SlaCalculationResult {
    const now = new Date()
    let slaDue = new Date(createdAt)

    if (config?.businessHours?.enabled) {
      // Complex business hours calculation
      slaDue = this.addBusinessDays(createdAt, slaDays, config.businessHours)
    } else {
      // Simple calendar days
      slaDue.setDate(slaDue.getDate() + slaDays)
    }

    const isOverdue = now > slaDue
    const hoursRemaining = Math.max(0, (slaDue.getTime() - now.getTime()) / (1000 * 60 * 60))

    let severity: SlaCalculationResult['severity'] = 'normal'
    if (isOverdue) {
      severity = 'overdue'
    } else if (hoursRemaining <= 24) {
      severity = 'critical'
    } else if (hoursRemaining <= 48) {
      severity = 'warning'
    }

    return {
      slaDue,
      isOverdue,
      hoursRemaining: Math.round(hoursRemaining * 100) / 100,
      severity,
    }
  }

  /**
   * Add business days considering business hours
   */
  private addBusinessDays(
    startDate: Date,
    days: number,
    businessHours: NonNullable<SlaConfig['businessHours']>
  ): Date {
    const result = new Date(startDate)
    let addedDays = 0

    while (addedDays < days) {
      result.setDate(result.getDate() + 1)
      const dayOfWeek = result.getDay()

      // Check if it's a business day
      if (businessHours.weekdays.includes(dayOfWeek)) {
        addedDays++
      }
    }

    // Set to end of business hours
    result.setHours(businessHours.endHour, 0, 0, 0)

    return result
  }

  /**
   * Get default SLA configurations by category
   */
  getDefaultSlaConfig(category: string): SlaConfig {
    const baseEscalation = [
      {
        hours: 24, // 1 day after SLA breach
        action: 'notify' as const,
        recipients: ['supervisor'],
        template: 'sla_breach_notification',
      },
      {
        hours: 72, // 3 days after SLA breach
        action: 'escalate' as const,
        recipients: ['manager', 'admin'],
        template: 'sla_escalation',
      },
    ]

    const configs: Record<string, SlaConfig> = {
      complaint: {
        category: 'complaint',
        slaDays: 14,
        escalationLevels: baseEscalation,
        businessHours: {
          enabled: true,
          startHour: 9,
          endHour: 17,
          weekdays: [1, 2, 3, 4, 5], // Monday to Friday
        },
      },
      suggestion: {
        category: 'suggestion',
        slaDays: 30,
        escalationLevels: [
          {
            hours: 168, // 7 days after SLA breach
            action: 'notify',
            recipients: ['supervisor'],
            template: 'suggestion_overdue',
          },
        ],
      },
      rti: {
        category: 'rti',
        slaDays: 30,
        escalationLevels: [
          {
            hours: 24, // 1 day after SLA breach - RTI is legally mandated
            action: 'escalate',
            recipients: ['rti_officer', 'admin'],
            template: 'rti_breach_urgent',
          },
          {
            hours: 72, // 3 days after SLA breach
            action: 'escalate',
            recipients: ['chief_officer'],
            template: 'rti_breach_critical',
          },
        ],
        businessHours: {
          enabled: true,
          startHour: 9,
          endHour: 17,
          weekdays: [1, 2, 3, 4, 5],
        },
      },
      general: {
        category: 'general',
        slaDays: 7,
        escalationLevels: baseEscalation,
      },
    }

    return configs[category] || configs.general
  }

  /**
   * Check for SLA breaches and queue escalation actions
   */
  async checkSlaBreaches(): Promise<EscalationAction[]> {
    const overdueSubmissions = await formService.getOverdueSubmissions()
    const actions: EscalationAction[] = []

    for (const submission of overdueSubmissions) {
      const form = submission.form
      if (!form) continue

      // Get SLA config for this form's category
      const formSchema = form.schema as any
      const category = formSchema?.settings?.category || 'general'
      const config = this.getDefaultSlaConfig(category)

      // Calculate hours since SLA breach
      const now = new Date()
      const hoursOverdue = (now.getTime() - submission.slaDue.getTime()) / (1000 * 60 * 60)

      // Check which escalation levels should trigger
      for (let i = 0; i < config.escalationLevels.length; i++) {
        const level = config.escalationLevels[i]
        
        if (hoursOverdue >= level.hours) {
          // Check if this escalation has already been triggered
          const existingActions = await this.getEscalationActions(submission.id, i)
          
          if (existingActions.length === 0) {
            const action: EscalationAction = {
              submissionId: submission.id,
              level: i,
              action: level.action,
              scheduledFor: now,
              completed: false,
            }
            
            actions.push(action)
            
            // Save the escalation action
            await this.saveEscalationAction(action)
          }
        }
      }
    }

    return actions
  }

  /**
   * Get escalation actions for a submission
   */
  private async getEscalationActions(submissionId: string, level: number): Promise<any[]> {
    // This would typically be stored in a separate EscalationAction table
    // For now, we'll check the submission history
    const submission = await this.db.submission.findUnique({
      where: { id: submissionId },
      select: { history: true },
    })

    if (!submission?.history) return []

    const history = submission.history as any[]
    return history.filter(
      entry => entry.action === 'escalation' && entry.level === level
    )
  }

  /**
   * Save escalation action to database
   */
  private async saveEscalationAction(action: EscalationAction): Promise<void> {
    // Update submission history with escalation record
    const submission = await this.db.submission.findUnique({
      where: { id: action.submissionId },
      select: { history: true },
    })

    if (!submission) return

    const currentHistory = (submission.history as any[]) || []
    const escalationEntry = {
      timestamp: action.scheduledFor,
      action: 'escalation',
      level: action.level,
      type: action.action,
      notes: `SLA escalation level ${action.level + 1}: ${action.action}`,
    }

    await this.db.submission.update({
      where: { id: action.submissionId },
      data: {
        history: [...currentHistory, escalationEntry] as any,
        // Update status if escalating
        ...(action.action === 'escalate' && { status: 'ESCALATED' }),
      },
    })

    // Audit log the escalation
    await auditLogger.log({
      action: 'sla.escalation',
      resource: 'Submission',
      resourceId: action.submissionId,
      actorId: 'system',
      metadata: {
        level: action.level,
        action: action.action,
        scheduledFor: action.scheduledFor,
      },
    })
  }

  /**
   * Process pending escalation actions
   */
  async processEscalations(): Promise<void> {
    const now = new Date()
    const overdueSubmissions = await formService.getOverdueSubmissions()

    for (const submission of overdueSubmissions) {
      const form = submission.form
      if (!form) continue

      const formSchema = form.schema as any
      const category = formSchema?.settings?.category || 'general'
      const config = this.getDefaultSlaConfig(category)

      // Process each escalation level
      for (let i = 0; i < config.escalationLevels.length; i++) {
        const level = config.escalationLevels[i]
        const hoursOverdue = (now.getTime() - submission.slaDue.getTime()) / (1000 * 60 * 60)

        if (hoursOverdue >= level.hours) {
          await this.executeEscalationAction(submission, level, i)
        }
      }
    }
  }

  /**
   * Execute a specific escalation action
   */
  private async executeEscalationAction(
    submission: Submission,
    level: SlaConfig['escalationLevels'][0],
    levelIndex: number
  ): Promise<void> {
    try {
      switch (level.action) {
        case 'notify':
          // Send notification to recipients
          await this.sendNotification(submission, level, levelIndex)
          break

        case 'escalate':
          // Change assignment or status
          await this.escalateSubmission(submission, level, levelIndex)
          break

        case 'auto_close':
          // Automatically close old submissions
          await this.autoCloseSubmission(submission, levelIndex)
          break
      }
    } catch (error) {
      console.error(`Failed to execute escalation action for submission ${submission.id}:`, error)
      
      // Audit log the failure
      await auditLogger.log({
        action: 'sla.escalation_failed',
        resource: 'Submission',
        resourceId: submission.id,
        actorId: 'system',
        metadata: {
          level: levelIndex,
          action: level.action,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }

  /**
   * Send notification for SLA breach
   */
  private async sendNotification(
    submission: Submission,
    level: SlaConfig['escalationLevels'][0],
    levelIndex: number
  ): Promise<void> {
    // This would integrate with the notification system
    // For now, just log the notification need
    console.log(`SLA Notification needed for submission ${submission.id}, level ${levelIndex}`)

    // Update submission history
    await formService.updateSubmission(
      submission.id,
      {
        history: [
          {
            timestamp: new Date(),
            status: submission.status,
            notes: `SLA breach notification sent (Level ${levelIndex + 1})`,
            userId: 'system',
          },
        ] as any,
      },
      'system'
    )
  }

  /**
   * Escalate submission to higher authority
   */
  private async escalateSubmission(
    submission: Submission,
    level: SlaConfig['escalationLevels'][0],
    levelIndex: number
  ): Promise<void> {
    // Find supervisor or manager to escalate to
    // This would typically query user roles
    const supervisorId = await this.findSupervisor(submission.assignedTo)

    await formService.updateSubmission(
      submission.id,
      {
        status: 'ESCALATED' as SubmissionStatus,
        ...(supervisorId && { assignedTo: supervisorId }),
      },
      'system'
    )

    console.log(`Submission ${submission.id} escalated to supervisor ${supervisorId}`)
  }

  /**
   * Auto-close old submissions
   */
  private async autoCloseSubmission(
    submission: Submission,
    levelIndex: number
  ): Promise<void> {
    await formService.updateSubmission(
      submission.id,
      {
        status: 'REJECTED' as SubmissionStatus,
        resolvedAt: new Date(),
      },
      'system'
    )

    console.log(`Submission ${submission.id} auto-closed due to extended SLA breach`)
  }

  /**
   * Find supervisor for escalation
   */
  private async findSupervisor(currentAssigneeId?: string | null): Promise<string | null> {
    if (!currentAssigneeId) return null

    // This would typically query user roles and organizational hierarchy
    // For now, return a placeholder
    const supervisors = await this.db.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: ['Admin', 'Supervisor'] },
            },
          },
        },
      },
      take: 1,
    })

    return supervisors[0]?.id || null
  }

  /**
   * Get SLA performance metrics
   */
  async getSlaMetrics(options?: {
    formId?: string
    category?: string
    from?: Date
    to?: Date
  }) {
    const { formId, category, from, to } = options || {}
    
    // Base stats from form service
    const stats = await formService.getSlaStats({ formId, from, to })
    
    // Add escalation metrics
    const escalatedCount = await this.db.submission.count({
      where: {
        ...(formId && { formId }),
        status: 'ESCALATED',
        ...(from && to && {
          createdAt: { gte: from, lte: to },
        }),
      },
    })

    // Average resolution time
    const resolvedSubmissions = await this.db.submission.findMany({
      where: {
        ...(formId && { formId }),
        status: 'RESOLVED',
        resolvedAt: { not: null },
        ...(from && to && {
          createdAt: { gte: from, lte: to },
        }),
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    })

    const avgResolutionHours = resolvedSubmissions.length > 0
      ? resolvedSubmissions.reduce((sum: number, sub: any) => {
          const hours = (sub.resolvedAt!.getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60)
          return sum + hours
        }, 0) / resolvedSubmissions.length
      : 0

    return {
      ...stats,
      escalatedCount,
      escalationRate: stats.total > 0 ? (escalatedCount / stats.total) * 100 : 0,
      avgResolutionHours: Math.round(avgResolutionHours * 100) / 100,
    }
  }
}

// Export singleton instance
export const slaEngine = new SlaEngine()
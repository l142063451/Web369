/**
 * SLA Monitoring Background Job
 * Based on INSTRUCTIONS_FOR_COPILOT.md §7
 * Runs periodically to check for SLA breaches and escalate submissions
 */

import { prisma } from '@/lib/db'
import { SubmissionService } from '@/lib/forms/submissions'
import { createAuditLog } from '@/lib/audit/logger'

const submissionService = new SubmissionService()

/**
 * SLA monitoring job - check for breaches and escalate
 */
export async function slaMonitoringJob() {
  console.log('Starting SLA monitoring job...')
  
  try {
    // Get all submissions that are breaching SLA
    const breachedSubmissions = await submissionService.getBreachedSubmissions()
    
    console.log(`Found ${breachedSubmissions.length} SLA-breached submissions`)
    
    for (const submission of breachedSubmissions) {
      // Skip if already escalated
      if (submission.status === 'ESCALATED') {
        continue
      }
      
      // Get form workflow configuration
      const form = await prisma.form.findUnique({
        where: { id: submission.form.id }
      })
      
      if (!form) continue
      
      const workflow = form.workflow as any
      const escalationRules = workflow?.escalationRules || []
      
      // Check if we should escalate based on rules
      const shouldEscalate = escalationRules.some((rule: any) => {
        const breachHours = Math.abs(submission.slaInfo.hoursRemaining)
        return rule.afterDays * 24 <= breachHours && rule.action === 'escalate'
      })
      
      if (shouldEscalate) {
        // Escalate submission
        await submissionService.updateSubmissionStatus(
          submission.id,
          {
            status: 'ESCALATED',
            note: `Auto-escalated due to SLA breach (${submission.slaInfo.hoursRemaining} hours overdue)`
          },
          'system'
        )
        
        console.log(`Escalated submission ${submission.id} due to SLA breach`)
        
        // TODO: Send escalation notifications
        // await notificationService.sendEscalationAlert(submission)
      } else {
        // Just log the breach for now
        console.log(`SLA breached for submission ${submission.id}: ${submission.slaInfo.message}`)
        
        // TODO: Send breach warning notification
        // await notificationService.sendSLAWarning(submission)
      }
    }
    
    console.log('SLA monitoring job completed successfully')
    
  } catch (error) {
    console.error('SLA monitoring job failed:', error)
    
    // Log the failure for audit purposes
    await createAuditLog({
      actorId: 'system',
      action: 'CREATE', // Using existing action since ERROR doesn't exist
      resource: 'sla_job',
      resourceId: 'monitoring',
      diff: { error: String(error), timestamp: new Date() }
    }).catch(auditError => {
      console.error('Failed to log SLA job error:', auditError)
    })
  }
}

/**
 * Auto-assignment job - assign new submissions based on rules
 */
export async function autoAssignmentJob() {
  console.log('Starting auto-assignment job...')
  
  try {
    // Get unassigned pending submissions
    const unassignedSubmissions = await prisma.submission.findMany({
      where: {
        status: 'PENDING',
        assignedTo: null
      },
      include: {
        form: true,
        user: true
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`Found ${unassignedSubmissions.length} unassigned submissions`)
    
    for (const submission of unassignedSubmissions) {
      const workflow = submission.form.workflow as any
      const autoAssignment = workflow?.autoAssignment
      
      if (!autoAssignment?.enabled || !autoAssignment.rules?.length) {
        continue
      }
      
      // Find matching assignment rule
      for (const rule of autoAssignment.rules) {
        // Simple rule matching - can be enhanced with more complex logic
        const shouldAssign = await evaluateAssignmentRule(rule, submission)
        
        if (shouldAssign && rule.assignTo) {
          // Check if user exists and is active
          const assignee = await prisma.user.findUnique({
            where: { id: rule.assignTo }
          })
          
          if (assignee) {
            await submissionService.assignSubmission(
              submission.id,
              rule.assignTo,
              'system',
              `Auto-assigned based on rule: ${rule.condition}`
            )
            
            console.log(`Auto-assigned submission ${submission.id} to ${assignee.name}`)
            break // Stop after first matching rule
          }
        }
      }
    }
    
    console.log('Auto-assignment job completed successfully')
    
  } catch (error) {
    console.error('Auto-assignment job failed:', error)
    
    await createAuditLog({
      actorId: 'system',
      action: 'CREATE', // Using existing action since ERROR doesn't exist
      resource: 'assignment_job',
      resourceId: 'auto',
      diff: { error: String(error), timestamp: new Date() }
    }).catch(auditError => {
      console.error('Failed to log auto-assignment job error:', auditError)
    })
  }
}

/**
 * Simple rule evaluation for auto-assignment
 * In a real implementation, this could use a rule engine like JSON Logic
 */
async function evaluateAssignmentRule(rule: any, submission: any): Promise<boolean> {
  // Simple keyword-based matching for now
  const condition = rule.condition?.toLowerCase() || ''
  const formName = submission.form.name?.toLowerCase() || ''
  const submissionData = JSON.stringify(submission.data).toLowerCase()
  
  // Check if condition matches form name or submission data
  if (condition.includes('complaint') && formName.includes('complaint')) {
    return true
  }
  
  if (condition.includes('urgent') && submissionData.includes('urgent')) {
    return true
  }
  
  // Add more rule logic as needed
  return false
}

/**
 * Main worker function to run all SLA-related jobs
 */
export async function runSLAWorker() {
  console.log('Starting SLA worker...')
  
  // Run SLA monitoring
  await slaMonitoringJob()
  
  // Run auto-assignment  
  await autoAssignmentJob()
  
  console.log('SLA worker completed')
}

// If run directly
if (require.main === module) {
  runSLAWorker().then(() => {
    process.exit(0)
  }).catch((error) => {
    console.error('SLA worker failed:', error)
    process.exit(1)
  })
}
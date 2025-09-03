/**
 * Admin SLA Monitoring API Route
 * SLA metrics and escalation management
 * Part of PR07: Form Builder & SLA Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { checkPermission } from '@/lib/rbac/permissions'
import { slaEngine } from '@/lib/forms/sla'
import { formService } from '@/lib/forms/service'
import { slaWorker } from '@/workers/jobs/sla'
import { z } from 'zod'

// Validation schemas
const GetSlaMetricsSchema = z.object({
  formId: z.string().optional(),
  category: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']).optional(),
})

/**
 * GET /api/admin/sla
 * Get SLA metrics and performance data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const hasPermission = await checkPermission(session.user.id, 'sla', 'read')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = {
      formId: searchParams.get('formId') || undefined,
      category: searchParams.get('category') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      period: searchParams.get('period') || undefined,
    }

    const validation = GetSlaMetricsSchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { formId, category, from, to, period } = validation.data

    // Calculate date range if period is provided
    let dateFrom = from ? new Date(from) : undefined
    let dateTo = to ? new Date(to) : undefined

    if (period && !from && !to) {
      dateTo = new Date()
      switch (period) {
        case '7d':
          dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          dateFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          break
      }
    }

    // Get SLA metrics
    const metrics = await slaEngine.getSlaMetrics({
      formId,
      category,
      from: dateFrom,
      to: dateTo,
    })

    // Get overdue submissions
    const overdueSubmissions = await formService.getOverdueSubmissions()

    // Get worker status
    const workerStatus = await slaWorker.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        overdueCount: overdueSubmissions.length,
        overdueSubmissions: overdueSubmissions.slice(0, 10), // Top 10 most overdue
        worker: workerStatus,
        period: { from: dateFrom?.toISOString(), to: dateTo?.toISOString() },
      },
    })

  } catch (error) {
    console.error('Error fetching SLA metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SLA metrics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/sla
 * Trigger SLA actions (manual escalation check, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (only admins can trigger SLA actions)
    const hasPermission = await checkPermission(session.user.id, 'sla', 'execute')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, submissionId } = body

    let result

    switch (action) {
      case 'check_breaches':
        // Trigger manual SLA breach check
        result = await slaEngine.checkSlaBreaches()
        await slaWorker.triggerManualSlaCheck()
        break

      case 'process_escalations':
        // Process all pending escalations
        await slaEngine.processEscalations()
        result = { message: 'Escalations processed successfully' }
        break

      case 'escalate_submission':
        // Manually escalate a specific submission
        if (!submissionId) {
          return NextResponse.json(
            { error: 'Submission ID is required for manual escalation' },
            { status: 400 }
          )
        }
        await slaWorker.queueEscalationProcess(submissionId)
        result = { message: `Escalation queued for submission ${submissionId}` }
        break

      case 'clear_queue':
        // Clear the SLA worker queue (maintenance action)
        const cleared = await slaWorker.clearQueue()
        result = { message: `Cleared ${cleared} jobs from queue` }
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error executing SLA action:', error)
    return NextResponse.json(
      { error: 'Failed to execute SLA action' },
      { status: 500 }
    )
  }
}
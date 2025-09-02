/**
 * Form Submission Tracking API
 * Allows citizens to track their form submission status
 * Part of PR07: Form Builder & SLA Engine completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { formService } from '@/lib/forms/service'
import { slaEngine } from '@/lib/forms/sla'
import { z } from 'zod'

const TrackingSchema = z.object({
  submissionId: z.string().cuid().optional(),
  referenceNumber: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine(data => 
  data.submissionId || data.referenceNumber || data.email || data.phone,
  {
    message: "At least one identifier (submissionId, referenceNumber, email, or phone) is required",
  }
)

/**
 * POST /api/forms/track
 * Track form submission by reference number, email, or phone
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = TrackingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid tracking data',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { submissionId, referenceNumber, email, phone } = validation.data

    let submission
    
    if (submissionId) {
      // Direct lookup by submission ID
      submission = await formService.getSubmission(submissionId)
    } else if (referenceNumber) {
      // Lookup by reference number (extract ID from reference)
      const refMatch = referenceNumber.match(/REF-([A-Z0-9]{8})$/)
      if (refMatch) {
        const refSuffix = refMatch[1].toLowerCase()
        const { submissions } = await formService.getSubmissions({
          page: 1,
          limit: 50,
        })
        
        submission = submissions.find(s => 
          s.id.slice(-8).toUpperCase() === refSuffix.toUpperCase()
        )
      }
    } else if (email || phone) {
      // Lookup by user email/phone in form data
      const { submissions } = await formService.getSubmissions({
        page: 1,
        limit: 100,
      })
      
      submission = submissions.find(s => {
        const data = s.data as any
        if (email && (data.email === email || data.contactEmail === email)) {
          return true
        }
        if (phone && (data.phone === phone || data.contactPhone === phone)) {
          return true
        }
        return false
      })
    }

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Calculate SLA information
    const slaResult = slaEngine.calculateSlaDue(
      submission.createdAt,
      submission.form?.slaDays || 7
    )

    // Format timeline from submission history
    const history = (submission.history as any[]) || []
    const timeline = history.map((entry: any) => ({
      timestamp: entry.timestamp || entry.date,
      status: entry.status,
      notes: entry.notes || entry.message,
      updatedBy: entry.userId ? 'system' : 'staff',
    })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Prepare response data (sanitized for public view)
    const responseData = {
      id: submission.id,
      referenceNumber: `REF-${submission.id.slice(-8).toUpperCase()}`,
      formName: submission.form?.name || 'Unknown Form',
      status: submission.status,
      statusText: getStatusText(submission.status),
      submittedAt: submission.createdAt,
      lastUpdated: submission.updatedAt,
      sla: {
        dueDate: submission.slaDue,
        isOverdue: slaResult.isOverdue,
        hoursRemaining: slaResult.hoursRemaining,
        severity: slaResult.severity,
      },
      timeline,
      // Only show assigned person's name, not full details
      assignedTo: submission.assignedUser?.name || null,
      // Contact information for inquiries
      contactInfo: {
        email: 'support@example.com', // TODO: Make configurable
        phone: '+91-XXXXXXXXXX', // TODO: Make configurable
        hours: 'Monday to Friday, 9 AM to 5 PM',
      },
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })

  } catch (error) {
    console.error('Error tracking form submission:', error)
    return NextResponse.json(
      { error: 'Failed to track submission' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get human-readable status text
 */
function getStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    PENDING: 'Under Review',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Completed',
    REJECTED: 'Rejected',
    ESCALATED: 'Escalated to Senior Staff',
  }
  
  return statusTexts[status] || status
}
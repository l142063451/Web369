/**
 * Public Form Submission API Route
 * Handles public form submissions with Turnstile verification
 * Part of PR07: Form Builder & SLA Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { formService } from '@/lib/forms/service'
import { verifyTurnstile, getClientIP } from '@/lib/security/turnstile'
import { auditLogger } from '@/lib/auth/audit-logger'
import { z } from 'zod'

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const MAX_REQUESTS_PER_HOUR = 10
const HOUR_IN_MS = 60 * 60 * 1000

// Submission validation schema
const SubmissionSchema = z.object({
  data: z.record(z.unknown()),
  turnstileToken: z.string().optional(),
  metadata: z.object({
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    timestamp: z.string().optional(),
  }).optional(),
})

/**
 * Rate limiting check
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const key = `form_submit:${ip}`
  
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + HOUR_IN_MS,
    })
    return true
  }
  
  if (current.count >= MAX_REQUESTS_PER_HOUR) {
    return false
  }
  
  current.count++
  return true
}

/**
 * POST /api/forms/[id]/submit
 * Submit a form (public endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formId = params.id
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 })
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request) || 'unknown'
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Get the form
    const form = await formService.getForm(formId)
    
    if (!form || !form.active) {
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validation = SubmissionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid submission data', 
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { data, turnstileToken, metadata } = validation.data

    // Verify Turnstile token if provided (required in production)
    if (turnstileToken) {
      try {
        await verifyTurnstile(turnstileToken, clientIP)
      } catch (error) {
        console.error('Turnstile verification failed:', error)
        return NextResponse.json(
          { error: 'Security verification failed' },
          { status: 403 }
        )
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Security verification is required' },
        { status: 403 }
      )
    }

    // Prepare submission metadata
    const submissionMetadata = {
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
      referrer: request.headers.get('referer') || undefined,
      timestamp: new Date().toISOString(),
      ...metadata,
    }

    // Create submission
    const submission = await formService.createSubmission({
      formId,
      data,
      metadata: submissionMetadata,
      // Note: File handling would happen via separate upload endpoint
      // and file URLs would be included in the data
    })

    // Audit log the submission
    await auditLogger.log({
      action: 'form.submit',
      resource: 'Form',
      resourceId: formId,
      actorId: 'anonymous',
      metadata: {
        submissionId: submission.id,
        formName: form.name,
        ip: clientIP,
      },
    })

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        status: submission.status,
        message: 'Your submission has been received successfully.',
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Form submission error:', error)
    
    // Audit log the error
    await auditLogger.log({
      action: 'form.submit_error',
      resource: 'Form',
      resourceId: params.id,
      actorId: 'anonymous',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: getClientIP(request) || 'unknown',
      },
    }).catch(console.error)

    return NextResponse.json(
      { 
        error: 'Failed to submit form. Please try again later.',
        submissionId: null,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/forms/[id]/submit
 * Not allowed - submissions should use POST
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit forms.' },
    { status: 405 }
  )
}
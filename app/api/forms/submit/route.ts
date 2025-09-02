/**
 * Public Form Submission API
 * Allows citizens to submit forms with validation and anti-bot protection
 * Part of PR07: Form Builder & SLA Engine completion
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { formService } from '@/lib/forms/service'
import { validateFormData } from '@/lib/forms/schema'
import { verifyTurnstileFromRequest, isTurnstileEnabled } from '@/lib/security/turnstile'
import { rateLimit } from '@/lib/queue/rate-limit'
import { z } from 'zod'

// Validation schema for form submission
const SubmissionSchema = z.object({
  formId: z.string().cuid(),
  data: z.record(z.unknown()),
  files: z.array(z.string()).optional(),
  geo: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
    address: z.string().optional(),
  }).optional(),
  turnstileToken: z.string().optional(),
  'cf-turnstile-response': z.string().optional(),
})

/**
 * POST /api/forms/submit
 * Submit a form with validation and anti-bot protection
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const formId = url.searchParams.get('formId')
    
    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      )
    }

    // Rate limiting - 5 submissions per IP per 10 minutes
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    request.headers.get('cf-connecting-ip') || 
                    'unknown'

    const rateLimitResult = await rateLimit(`form_submit:${clientIP}`, {
      window: 10 * 60 * 1000, // 10 minutes
      max: 5,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(rateLimitResult.retryAfter / 1000)
        },
        { status: 429 }
      )
    }

    // Get form details
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

    const submissionData = validation.data

    // Check if form requires authentication
    const formSchema = form.schema as any
    const requiresAuth = formSchema?.settings?.requiresAuth || false
    const allowAnonymous = formSchema?.settings?.allowAnonymous ?? true

    if (requiresAuth && !allowAnonymous) {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Verify Turnstile token if enabled
    if (isTurnstileEnabled()) {
      try {
        await verifyTurnstileFromRequest(request)
      } catch (error) {
        return NextResponse.json(
          { 
            error: 'Bot verification failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        )
      }
    }

    // Validate form data against schema
    const dataValidation = validateFormData(formSchema, submissionData.data)
    if (!dataValidation.success) {
      return NextResponse.json(
        {
          error: 'Form validation failed',
          details: dataValidation.error.issues
        },
        { status: 400 }
      )
    }

    // Get user ID if authenticated
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // Create submission
    const submission = await formService.createSubmission({
      formId: submissionData.formId,
      userId,
      data: submissionData.data,
      files: submissionData.files || [],
      geo: submissionData.geo,
      metadata: {
        userAgent: request.headers.get('user-agent'),
        clientIP,
        submittedAt: new Date().toISOString(),
      },
    })

    // TODO: Queue notification email/SMS to user and admin
    // This would integrate with the notification system in future PRs

    // Return success response with submission reference
    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        referenceNumber: `REF-${submission.id.slice(-8).toUpperCase()}`,
        status: submission.status,
        slaDue: submission.slaDue,
        message: 'Form submitted successfully. You will receive updates on the status.',
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing form submission:', error)
    
    // Don't expose internal errors to client
    return NextResponse.json(
      { 
        error: 'Failed to process submission',
        message: 'Please try again later or contact support if the problem persists.'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/forms/submit?formId=xxx
 * Get form details for rendering the submission form
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const formId = url.searchParams.get('formId')
    
    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      )
    }

    // Get form details
    const form = await formService.getForm(formId)
    if (!form || !form.active) {
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 404 }
      )
    }

    // Return form schema and metadata for client-side rendering
    const formSchema = form.schema as any
    
    return NextResponse.json({
      success: true,
      data: {
        id: form.id,
        name: form.name,
        schema: {
          id: formSchema.id,
          title: formSchema.title,
          description: formSchema.description,
          fields: formSchema.fields,
          settings: {
            category: formSchema.settings.category,
            requiresAuth: formSchema.settings.requiresAuth,
            allowAnonymous: formSchema.settings.allowAnonymous,
            redirectUrl: formSchema.settings.redirectUrl,
          }
        },
        slaDays: form.slaDays,
        turnstileEnabled: isTurnstileEnabled(),
        ...(isTurnstileEnabled() && {
          turnstileSiteKey: process.env.TURNSTILE_SITE_KEY
        })
      }
    })

  } catch (error) {
    console.error('Error fetching form details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch form details' },
      { status: 500 }
    )
  }
}
/**
 * Public Form Submission API
 * Handles form submissions from public users
 * Part of PR07: Form Builder & SLA Engine
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { formService } from '@/lib/forms/service'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { validateFormDataFromFields } from '@/lib/forms/schema'
import { rateLimiter } from '@/lib/queue/rate-limit'
import { z } from 'zod'
import { headers } from 'next/headers'

const SubmissionSchema = z.object({
  data: z.record(z.unknown()),
  turnstileToken: z.string().optional(),
  formId: z.string(),
  geo: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  metadata: z.object({
    userAgent: z.string().optional(),
    timestamp: z.string(),
    referrer: z.string().nullable().optional(),
  }).optional(),
})

/**
 * POST /api/forms/[id]/submit
 * Submit a form with validation, anti-bot protection, and rate limiting
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const formId = params.id
  
  try {
    // Get IP address for rate limiting
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0]?.trim() || realIP || 'unknown'

    // Rate limiting
    const rateLimitKey = `form_submit:${ip}:${formId}`
    const rateLimitResult = await rateLimiter.consume(rateLimitKey)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Too many submissions. Please wait before trying again.' 
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = SubmissionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid submission data',
          errors: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { data, turnstileToken, geo, metadata } = validation.data

    // Get form configuration
    const form = await formService.getFormById(formId)
    if (!form || !form.active) {
      return NextResponse.json(
        { success: false, message: 'Form not found or inactive' },
        { status: 404 }
      )
    }

    const formSchema = form.schema as any

    // Check if form requires authentication
    if (formSchema.settings?.requiresAuth) {
      const session = await getServerSession(authOptions)
      
      if (!session?.user && !formSchema.settings?.allowAnonymous) {
        return NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Verify Turnstile token
    if (turnstileToken) {
      try {
        await verifyTurnstile(turnstileToken, ip)
      } catch (error) {
        console.error('Turnstile verification failed:', error)
        return NextResponse.json(
          { success: false, message: 'Anti-bot verification failed' },
          { status: 400 }
        )
      }
    }

    // Validate form data against schema
    const formValidation = validateFormDataFromFields(data, formSchema.fields || [])
    if (!formValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Form validation failed',
          errors: formValidation.error.issues.map(i => i.message)
        },
        { status: 400 }
      )
    }

    // Get user ID if authenticated
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    // Create submission
    const submission = await formService.createSubmission({
      formId,
      userId,
      data: formValidation.data,
      files: [], // Files will be handled separately via upload endpoints
      status: 'PENDING',
      geo: geo || null,
      metadata: {
        ip,
        userAgent: metadata?.userAgent || request.headers.get('user-agent') || '',
        referrer: metadata?.referrer || request.headers.get('referer') || '',
        submittedAt: new Date().toISOString(),
        ...metadata,
      },
    })

    // Send confirmation response
    const response = {
      success: true,
      message: 'Form submitted successfully',
      data: {
        submissionId: submission.id,
        status: submission.status,
        slaDue: submission.slaDue,
        trackingNumber: `${form.name.substring(0, 3).toUpperCase()}-${submission.id.substring(0, 8).toUpperCase()}`,
      },
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Form submission error:', error)
    
    // Log error without exposing internal details
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while processing your submission. Please try again.' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/forms/[id]/submit
 * Get form configuration for public access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const formId = params.id

  try {
    const form = await formService.getFormById(formId)
    
    if (!form || !form.active) {
      return NextResponse.json(
        { success: false, message: 'Form not found or inactive' },
        { status: 404 }
      )
    }

    // Return public form configuration
    const publicConfig = {
      id: form.id,
      name: form.name,
      schema: form.schema,
      slaDays: form.slaDays,
      active: form.active,
    }

    return NextResponse.json({
      success: true,
      data: publicConfig,
    })

  } catch (error) {
    console.error('Error fetching form:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load form' },
      { status: 500 }
    )
  }
}
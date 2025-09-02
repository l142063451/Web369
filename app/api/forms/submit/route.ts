/**
 * Public Form Submission API
 * POST /api/forms/submit - Submit form data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'

import { authOptions } from '@/lib/auth/authOptions'
import { FormService, SubmissionDataSchema } from '@/lib/forms/service'
import { verifyTurnstile } from '@/lib/security/turnstile'

const formService = new FormService()

/**
 * POST /api/forms/submit
 * Submit form data with validation and anti-bot protection
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = headers()
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    
    // TODO: Add rate limiting here in production
    // For now, we'll skip rate limiting to avoid dependency issues

    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    // Parse and validate submission data
    const submissionData = SubmissionDataSchema.parse(body)
    
    // Get form to check settings
    const form = await formService.getForm(submissionData.formId)
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }
    
    const formSettings = (form.schema as any)?.settings || {}
    
    // Check authentication requirements
    if (formSettings.requireAuth && !session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Verify Turnstile token if captcha is enabled
    if (formSettings.enableCaptcha && submissionData.turnstileToken) {
      const turnstileValid = await verifyTurnstile(submissionData.turnstileToken, ip)
      if (!turnstileValid) {
        return NextResponse.json(
          { error: 'Captcha verification failed' },
          { status: 400 }
        )
      }
    }
    
    // Submit the form
    const submission = await formService.submitForm(
      submissionData,
      session?.user?.id
    )
    
    // Return success response
    const response: any = {
      success: true,
      submissionId: submission.id,
      message: formSettings.confirmationMessage || 'Form submitted successfully'
    }
    
    // Handle redirect if specified
    if (formSettings.redirectUrl) {
      response.redirectUrl = formSettings.redirectUrl
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Form submission error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
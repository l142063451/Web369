/**
 * Service Submission API - PR08
 * Handles citizen service request submissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/authOptions'
import { submitServiceRequest, validateServiceFormData } from '@/lib/services/service'
import { SERVICE_CATEGORIES, type ServiceType } from '@/lib/services/config'
// import { rateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - temporarily disabled
    // const rateLimitResult = await rateLimit(request, 'service-submit', 5, 300) // 5 requests per 5 minutes
    // if (!rateLimitResult.success) {
    //   return NextResponse.json(
    //     { error: 'Too many requests. Please try again later.' },
    //     { status: 429 }
    //   )
    // }

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { serviceType, formData } = body

    // Validate service type
    if (!SERVICE_CATEGORIES[serviceType as ServiceType]) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      )
    }

    // Validate form data
    const validation = validateServiceFormData(serviceType, formData)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid form data', details: validation.errors },
        { status: 400 }
      )
    }

    // Submit the service request
    const submission = await submitServiceRequest(
      serviceType,
      formData,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: 'Service request submitted successfully'
    })

  } catch (error) {
    console.error('Service submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit service request' },
      { status: 500 }
    )
  }
}
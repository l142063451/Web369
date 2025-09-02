/**
 * Admin Media API - Presigned Upload URLs
 * POST /api/admin/media/presign - Get presigned upload URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { 
  generatePresignedUrl, 
  validateFileConstraints,
  getMimeTypeFromExtension,
  type PresignRequest 
} from '@/lib/uploads/presign'

const PresignRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().min(1),
  contentType: z.string().optional(),
})

/**
 * POST /api/admin/media/presign
 * Generate presigned URL for file upload
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'media:upload'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const { filename, size, contentType: providedContentType } = PresignRequestSchema.parse(body)
    
    // Determine content type if not provided
    const contentType = providedContentType || getMimeTypeFromExtension(filename)
    
    // Validate file constraints
    const validation = validateFileConstraints(contentType, size)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    const presignRequest: PresignRequest = {
      filename,
      contentType,
      size,
    }
    
    const result = await generatePresignedUrl(presignRequest)
    
    return NextResponse.json({
      success: true,
      data: result,
    })
    
  } catch (error) {
    console.error('Presign error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
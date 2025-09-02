/**
 * Admin Media API - File Management
 * POST /api/admin/media/files - Create media record after upload
 * GET /api/admin/media/files - List media files
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth/authOptions'
import { hasPermission } from '@/lib/auth/rbac'
import { MediaService } from '@/lib/content/service'
import { scanFileFromUrl } from '@/lib/uploads/clamav'

const CreateMediaSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  alt: z.string().optional(),
  caption: z.string().optional(),
  meta: z.record(z.unknown()).default({}),
})

const ListMediaSchema = z.object({
  isPublic: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

/**
 * POST /api/admin/media/files
 * Create media record and trigger scan
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
    const validated = CreateMediaSchema.parse(body)
    
    // Create media record
    const media = await MediaService.createMedia({
      url: validated.url,
      alt: validated.alt,
      caption: validated.caption,
      meta: {
        ...validated.meta,
        key: validated.key,
      },
      createdBy: session.user.id,
    })
    
    // Trigger async file scan
    scanFileFromUrl(validated.url)
      .then(async (scanResult) => {
        try {
          await MediaService.markMediaScanned(media.id, scanResult)
          console.log(`Media ${media.id} scanned:`, scanResult.isClean ? 'CLEAN' : 'INFECTED')
        } catch (error) {
          console.error('Failed to update scan result:', error)
        }
      })
      .catch((error) => {
        console.error('File scan failed:', error)
      })
    
    return NextResponse.json({
      success: true,
      data: media,
      message: 'Media created successfully. File scanning in progress.',
    })
    
  } catch (error) {
    console.error('Create media error:', error)
    
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

/**
 * GET /api/admin/media/files
 * List media files with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permissions
    if (!(await hasPermission(session.user.id, 'media:read'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const params = {
      isPublic: searchParams.get('isPublic'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    }
    
    const validated = ListMediaSchema.parse(params)
    const result = await MediaService.listMedia(validated)
    
    return NextResponse.json({
      success: true,
      data: result.media,
      meta: {
        total: result.total,
        limit: validated.limit,
        offset: validated.offset,
        hasMore: result.total > validated.offset + validated.limit,
      },
    })
    
  } catch (error) {
    console.error('List media error:', error)
    
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
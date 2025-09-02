import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin } from '@/lib/rbac/permissions'
import { prisma } from "@/lib/db"
import { auditLogger } from '@/lib/audit/logger'
import { 
  generatePresignedUpload, 
  validateFileType, 
  validateFileSize,
  getMimeTypeFromExtension 
} from '@/lib/uploads/presign'

// POST /api/admin/media/upload - Generate presigned upload URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessAdmin(session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { filename, contentType, size } = await request.json()

    if (!filename || !contentType || !size) {
      return NextResponse.json(
        { error: 'Filename, content type, and size are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!validateFileType(filename)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Validate file size
    if (!validateFileSize(size)) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit (50MB)' },
        { status: 400 }
      )
    }

    // Generate presigned upload URL
    const { uploadUrl, fileUrl, fileId } = await generatePresignedUpload({
      filename,
      contentType,
      size,
    })

    // Create media record in database (pending scan)
    const media = await prisma.media.create({
      data: {
        id: fileId,
        url: fileUrl,
        alt: null,
        caption: null,
        meta: {
          filename,
          fileSize: size,
          mimeType: contentType || getMimeTypeFromExtension(filename),
        },
        scannedAt: null, // Will be set after scan completes
        isPublic: false, // Will be set to true after successful scan
        createdBy: session.user.id,
      },
    })

    // Log audit event
    await auditLogger.log(session.user.id, 'UPLOAD_INITIATED', 'media', media.id, {
      filename,
      fileSize: size,
      mimeType: contentType,
    })

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      fileId: media.id,
      media,
    })
  } catch (error) {
    console.error('Failed to generate upload URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
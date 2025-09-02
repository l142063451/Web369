import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin } from '@/lib/rbac/permissions'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/audit/logger'

// PATCH /api/admin/media/[id] - Update media metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessAdmin(session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { alt, caption } = body

    // Get existing media for audit
    const existingMedia = await prisma.media.findUnique({
      where: { id },
    })

    if (!existingMedia) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 })
    }

    // Update media metadata
    const media = await prisma.media.update({
      where: { id },
      data: {
        alt: alt !== undefined ? alt : existingMedia.alt,
        caption: caption !== undefined ? caption : existingMedia.caption,
      },
      include: {
        createdByUser: { select: { name: true, email: true } },
      },
    })

    // Log audit event with changes
    const changes = {
      alt: alt !== undefined && alt !== existingMedia.alt 
        ? { from: existingMedia.alt, to: alt } 
        : undefined,
      caption: caption !== undefined && caption !== existingMedia.caption 
        ? { from: existingMedia.caption, to: caption } 
        : undefined,
    }

    if (changes.alt || changes.caption) {
      await auditLogger.log(session.user.id, 'UPDATE', 'media', id, changes)
    }

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Failed to update media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/media/[id] - Delete media file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await canAccessAdmin(session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params

    // Get media for audit log before deletion
    const media = await prisma.media.findUnique({
      where: { id },
      select: { 
        id: true, 
        url: true, 
        alt: true, 
        meta: true,
        isPublic: true 
      },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 })
    }

    // Check if file is being used in content
    // This is a simplified check - in production you'd want to check all possible references
    const pagesUsingMedia = await prisma.page.findMany({
      where: {
        OR: [
          { blocks: { path: ['$[*].content'], string_contains: media.url } },
          { seo: { path: ['image'], equals: media.url } },
        ],
      },
      select: { id: true, title: true, slug: true },
    })

    if (pagesUsingMedia.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete media file that is in use',
          usedIn: pagesUsingMedia,
        },
        { status: 409 }
      )
    }

    // Delete from database
    await prisma.media.delete({
      where: { id },
    })

    // In production, you would also delete the actual file from S3/storage
    // await deleteFromStorage(media.url)

    // Log audit event
    await auditLogger.log(session.user.id, 'DELETE', 'media', id, {
      filename: (media.meta as any).filename,
      url: media.url,
      alt: media.alt,
      wasPublic: media.isPublic,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete media:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
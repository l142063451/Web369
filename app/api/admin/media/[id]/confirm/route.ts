import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { canAccessAdmin } from '@/lib/rbac/permissions'
import { prisma } from '@/lib/db'
import { auditLogger } from '@/lib/audit/logger'
import { scanFile, quarantineFile } from '@/lib/uploads/clamav'

// POST /api/admin/media/[id]/confirm - Confirm upload and trigger scan
export async function POST(
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

    // Get the media record
    const media = await prisma.media.findUnique({
      where: { id },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media file not found' }, { status: 404 })
    }

    if (media.scannedAt) {
      return NextResponse.json({ error: 'File already scanned' }, { status: 409 })
    }

    // Initiate file scan
    console.log(`Starting scan for file: ${media.url}`)
    
    try {
      const scanResult = await scanFile(media.url)
      
      if (scanResult.isClean) {
        // Mark file as clean and public
        const updatedMedia = await prisma.media.update({
          where: { id },
          data: {
            scannedAt: new Date(),
            isPublic: true,
          },
          include: {
            createdByUser: { select: { name: true, email: true } },
          },
        })

        // Log successful scan
        await auditLogger.log(session.user.id, 'SCAN_COMPLETE', 'media', id, {
          filename: (media.meta as any).filename,
          result: 'CLEAN',
          scannedAt: updatedMedia.scannedAt,
        })

        return NextResponse.json({
          success: true,
          media: updatedMedia,
          scanResult: { status: 'clean' },
        })
      } else {
        // File is infected, quarantine it
        await quarantineFile(media.url, scanResult.signature || scanResult.error || 'Unknown threat')
        
        const updatedMedia = await prisma.media.update({
          where: { id },
          data: {
            scannedAt: new Date(),
            isPublic: false, // Keep as private/quarantined
          },
          include: {
            createdByUser: { select: { name: true, email: true } },
          },
        })

        // Log infected file
        await auditLogger.log(session.user.id, 'SCAN_COMPLETE', 'media', id, {
          filename: (media.meta as any).filename,
          result: 'INFECTED',
          signature: scanResult.signature,
          error: scanResult.error,
          scannedAt: updatedMedia.scannedAt,
        })

        return NextResponse.json({
          success: false,
          media: updatedMedia,
          scanResult: {
            status: 'infected',
            signature: scanResult.signature,
            error: scanResult.error,
          },
        })
      }
    } catch (scanError) {
      console.error('File scan failed:', scanError)
      
      // Mark as scan failed
      const updatedMedia = await prisma.media.update({
        where: { id },
        data: {
          scannedAt: new Date(),
          isPublic: false, // Don't make public if scan failed
        },
        include: {
          createdByUser: { select: { name: true, email: true } },
        },
      })

      // Log scan failure
      await auditLogger.log(session.user.id, 'SCAN_FAILED', 'media', id, {
        filename: (media.meta as any).filename,
        error: scanError instanceof Error ? scanError.message : 'Unknown scan error',
        scannedAt: updatedMedia.scannedAt,
      })

      return NextResponse.json({
        success: false,
        media: updatedMedia,
        scanResult: {
          status: 'error',
          error: scanError instanceof Error ? scanError.message : 'Scan failed',
        },
      })
    }
  } catch (error) {
    console.error('Failed to confirm upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
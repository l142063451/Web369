import { randomUUID } from 'crypto'

// Mock S3 service for development - replace with actual AWS S3 client in production
interface UploadConfig {
  filename: string
  contentType: string
  size: number
}

interface PresignedUpload {
  uploadUrl: string
  fileUrl: string
  fileId: string
}

export async function generatePresignedUpload(config: UploadConfig): Promise<PresignedUpload> {
  // For development, we'll use a mock implementation
  // In production, this would use AWS S3 SDK to generate presigned URLs
  
  const fileId = randomUUID()
  const extension = config.filename.split('.').pop()
  const key = `media/${fileId}.${extension}`
  
  // Mock URLs for development
  const uploadUrl = `${process.env.S3_ENDPOINT || 'https://spaces.local'}/${process.env.S3_BUCKET || 'ummid-media'}/${key}?presigned=true`
  const fileUrl = `${process.env.S3_ENDPOINT || 'https://spaces.local'}/${process.env.S3_BUCKET || 'ummid-media'}/${key}`
  
  return {
    uploadUrl,
    fileUrl,
    fileId,
  }
}

export function validateFileType(filename: string): boolean {
  const allowedExtensions = [
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    // Documents
    '.pdf', '.doc', '.docx', '.txt', '.md',
    // Other
    '.zip', '.csv', '.json'
  ]
  
  const extension = '.' + filename.split('.').pop()?.toLowerCase()
  return allowedExtensions.includes(extension)
}

export function validateFileSize(size: number): boolean {
  const maxSize = 50 * 1024 * 1024 // 50MB
  return size <= maxSize
}

export function getMimeTypeFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
    zip: 'application/zip',
    csv: 'text/csv',
    json: 'application/json',
  }
  
  return mimeTypes[extension || ''] || 'application/octet-stream'
}

export function extractImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null)
      return
    }
    
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}
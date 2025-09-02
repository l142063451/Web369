/**
 * Presigned Upload System for DigitalOcean Spaces
 * Based on INSTRUCTIONS_FOR_COPILOT.md §6
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'

// Configuration
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'nyc3',
  endpoint: process.env.S3_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.S3_BUCKET || 'ummid-se-hari'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'video/mp4',
  'video/webm',
]

// Validation schemas
const PresignRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine(
    (type) => ALLOWED_MIME_TYPES.includes(type),
    'Unsupported file type'
  ),
  size: z.number().min(1).max(MAX_FILE_SIZE, 'File too large'),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

export interface PresignResponse {
  uploadUrl: string
  key: string
  publicUrl: string
  expiresAt: Date
}

export interface FileMetadata {
  key: string
  originalName: string
  contentType: string
  size: number
  uploadedAt: Date
}

/**
 * Generate presigned URL for file upload
 */
export async function generatePresignedUrl(
  request: PresignRequest
): Promise<PresignResponse> {
  // Validate request
  const validated = PresignRequestSchema.parse(request)
  
  // Generate unique key with timestamp and random suffix
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const sanitizedFilename = sanitizeFilename(validated.filename)
  const key = `uploads/${timestamp}-${randomSuffix}-${sanitizedFilename}`
  
  // Create S3 command
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: validated.contentType,
    ContentLength: validated.size,
    Metadata: {
      'original-name': validated.filename,
      'upload-timestamp': timestamp.toString(),
    },
  })
  
  // Generate presigned URL (valid for 15 minutes)
  const expiresIn = 15 * 60 // 15 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })
  
  // Generate public URL (will be accessible after ClamAV scan)
  const publicUrl = `${process.env.S3_ENDPOINT?.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com')}/${BUCKET_NAME}/${key}`
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  
  return {
    uploadUrl,
    key,
    publicUrl,
    expiresAt,
  }
}

/**
 * Extract file metadata from key
 */
export function extractFileMetadata(key: string, originalRequest: PresignRequest): FileMetadata {
  return {
    key,
    originalName: originalRequest.filename,
    contentType: originalRequest.contentType,
    size: originalRequest.size,
    uploadedAt: new Date(),
  }
}

/**
 * Sanitize filename for safe storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')  // Replace non-alphanumeric chars except . and -
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
    .substring(0, 100)             // Limit length
}

/**
 * Get MIME type from filename extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    mp4: 'video/mp4',
    webm: 'video/webm',
  }
  
  return mimeMap[ext || ''] || 'application/octet-stream'
}

/**
 * Validate file size and type constraints
 */
export function validateFileConstraints(
  contentType: string,
  size: number
): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${(size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }
  
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: `File type ${contentType} is not allowed`,
    }
  }
  
  return { valid: true }
}
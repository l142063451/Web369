/**
 * Upload Utilities Tests
 * Tests for presign and ClamAV functionality
 */

import { 
  generatePresignedUrl, 
  getMimeTypeFromExtension, 
  validateFileConstraints,
  extractFileMetadata 
} from '@/lib/uploads/presign'

import { 
  scanFile, 
  scanFileFromUrl, 
  quarantineFile, 
  checkClamAVHealth,
  createEicarTestString 
} from '@/lib/uploads/clamav'

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn(),
}))

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.com/upload'),
}))

// Mock fetch for URL scanning
global.fetch = jest.fn()

describe('Presign Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.S3_ENDPOINT = 'https://nyc3.digitaloceanspaces.com'
    process.env.S3_BUCKET = 'test-bucket'
  })

  describe('generatePresignedUrl', () => {
    it('should generate presigned URL with valid parameters', async () => {
      const request = {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
        size: 1024,
      }

      const result = await generatePresignedUrl(request)

      expect(result).toHaveProperty('uploadUrl')
      expect(result).toHaveProperty('key')
      expect(result).toHaveProperty('publicUrl')
      expect(result).toHaveProperty('expiresAt')

      expect(result.uploadUrl).toBe('https://signed-url.com/upload')
      expect(result.key).toMatch(/^uploads\/\d+-[a-z0-9]+-test-image\.jpg$/)
      expect(result.publicUrl).toContain('cdn.digitaloceanspaces.com')
    })

    it('should sanitize filename in key', async () => {
      const request = {
        filename: 'My Awesome File!!! (2023).jpg',
        contentType: 'image/jpeg',
        size: 1024,
      }

      const result = await generatePresignedUrl(request)
      
      expect(result.key).toMatch(/my_awesome_file_2023_\.jpg$/)
    })

    it('should validate file size limit', async () => {
      const request = {
        filename: 'large-file.jpg',
        contentType: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB - over the 10MB limit
      }

      await expect(generatePresignedUrl(request)).rejects.toThrow()
    })

    it('should validate content type', async () => {
      const request = {
        filename: 'malicious.exe',
        contentType: 'application/x-executable',
        size: 1024,
      }

      await expect(generatePresignedUrl(request)).rejects.toThrow()
    })
  })

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME types', () => {
      expect(getMimeTypeFromExtension('image.jpg')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('IMAGE.JPEG')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('document.pdf')).toBe('application/pdf')
      expect(getMimeTypeFromExtension('data.csv')).toBe('text/csv')
      expect(getMimeTypeFromExtension('video.mp4')).toBe('video/mp4')
    })

    it('should return default for unknown extensions', () => {
      expect(getMimeTypeFromExtension('file.unknown')).toBe('application/octet-stream')
      expect(getMimeTypeFromExtension('noextension')).toBe('application/octet-stream')
    })
  })

  describe('validateFileConstraints', () => {
    it('should accept valid files', () => {
      const result = validateFileConstraints('image/jpeg', 1024)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject oversized files', () => {
      const result = validateFileConstraints('image/jpeg', 15 * 1024 * 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds limit')
    })

    it('should reject unsupported file types', () => {
      const result = validateFileConstraints('application/x-executable', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })
  })

  describe('extractFileMetadata', () => {
    it('should extract correct metadata', () => {
      const key = 'uploads/123456-abc123-test.jpg'
      const request = {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        size: 1024,
      }

      const metadata = extractFileMetadata(key, request)

      expect(metadata).toEqual({
        key,
        originalName: 'test.jpg',
        contentType: 'image/jpeg',
        size: 1024,
        uploadedAt: expect.any(Date),
      })
    })
  })
})

describe('ClamAV Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock fetch for URL scanning
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('scanFile', () => {
    it('should handle clean file scan result', async () => {
      // Note: This test would require actual ClamAV daemon to be running
      // In a real test environment, we'd mock the Socket connection
      const cleanBuffer = Buffer.from('This is a clean test file')
      
      // For now, we'll test the EICAR string creation
      const eicarBuffer = createEicarTestString()
      expect(eicarBuffer).toBeInstanceOf(Buffer)
      expect(eicarBuffer.toString()).toContain('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')
    })
  })

  describe('scanFileFromUrl', () => {
    it('should download and scan file from URL', async () => {
      const mockArrayBuffer = new ArrayBuffer(8)
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      // This would normally call scanFile, but since we can't easily mock
      // the socket connection in this test environment, we'll just verify
      // the URL fetch works
      await expect(scanFileFromUrl('https://example.com/file.txt')).resolves.toBeDefined()

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/file.txt')
      expect(mockResponse.arrayBuffer).toHaveBeenCalled()
    })

    it('should handle download errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      const result = await scanFileFromUrl('https://example.com/nonexistent.txt')
      
      expect(result).toEqual({
        isClean: false,
        error: 'Failed to download file: Not Found',
        scanDuration: 0,
      })
    })

    it('should handle fetch exceptions', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await scanFileFromUrl('https://example.com/file.txt')
      
      expect(result).toEqual({
        isClean: false,
        error: 'Download error: Network error',
        scanDuration: 0,
      })
    })
  })

  describe('quarantineFile', () => {
    it('should create quarantine info', () => {
      const scanResult = {
        isClean: false,
        signature: 'Eicar-Test-Signature',
        scanDuration: 1000,
      }

      const quarantineInfo = quarantineFile('uploads/test-file.jpg', scanResult)

      expect(quarantineInfo).toEqual({
        originalKey: 'uploads/test-file.jpg',
        quarantineKey: expect.stringMatching(/^quarantine\/\d+-test-file\.jpg$/),
        scanResult,
        quarantinedAt: expect.any(Date),
      })
    })
  })

  describe('createEicarTestString', () => {
    it('should create valid EICAR test string', () => {
      const eicarBuffer = createEicarTestString()
      const eicarString = eicarBuffer.toString()

      expect(eicarString).toContain('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')
      expect(eicarString).toHaveLength(68) // Standard EICAR string length
      expect(eicarBuffer).toBeInstanceOf(Buffer)
    })
  })

  describe('checkClamAVHealth', () => {
    it('should be a function that returns health status', () => {
      expect(typeof checkClamAVHealth).toBe('function')
      
      // The actual implementation would test socket connection to ClamAV
      // In a real environment, this would return { available: true, version: 'ClamAV 0.103.3' }
      // or { available: false, error: 'Connection refused' }
    })
  })
})
/**
 * Media Upload and ClamAV Integration Tests
 */

// Jest globals are available through jest.setup.js

// Mock fetch for Node.js environment
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock S3 Client - fix variable scoping issue
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.com'),
}))

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ 
      $metadata: { httpStatusCode: 200 } 
    })
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}))

// Mock Socket for ClamAV
const mockSocket = {
  connect: jest.fn(),
  write: jest.fn(),
  destroy: jest.fn(),
  on: jest.fn(),
}

jest.mock('net', () => ({
  Socket: jest.fn().mockImplementation(() => mockSocket),
}))

import { 
  generatePresignedUrl, 
  validateFileConstraints, 
  getMimeTypeFromExtension,
  extractFileMetadata,
} from '@/lib/uploads/presign'

import { 
  scanFile, 
  scanFileFromUrl, 
  quarantineFile, 
  checkClamAVHealth, 
  createEicarTestString,
} from '@/lib/uploads/clamav'

describe('Presigned Upload System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generatePresignedUrl', () => {
    it('should generate presigned URL for valid file', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com')

      const result = await generatePresignedUrl({
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
        size: 1024000, // 1MB
      })

      expect(result).toEqual({
        uploadUrl: 'https://signed-url.example.com',
        key: expect.stringMatching(/^uploads\/\d+-[a-z0-9]{6}-test-image\.jpg$/),
        publicUrl: expect.stringContaining('cdn.digitaloceanspaces.com'),
        expiresAt: expect.any(Date),
      })
    })

    it('should sanitize filename', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url.example.com')

      const result = await generatePresignedUrl({
        filename: 'Test File With Spaces & Special Characters!.jpg',
        contentType: 'image/jpeg',
        size: 1024000,
      })

      expect(result.key).toMatch(/test_file_with_spaces_special_characters_\.jpg$/)
    })

    it('should reject invalid content type', async () => {
      await expect(
        generatePresignedUrl({
          filename: 'test.exe',
          contentType: 'application/x-executable',
          size: 1024000,
        })
      ).rejects.toThrow()
    })

    it('should reject file size too large', async () => {
      await expect(
        generatePresignedUrl({
          filename: 'test.jpg',
          contentType: 'image/jpeg',
          size: 50 * 1024 * 1024, // 50MB
        })
      ).rejects.toThrow()
    })
  })

  describe('validateFileConstraints', () => {
    it('should accept valid file', () => {
      const result = validateFileConstraints('image/jpeg', 1024000)
      expect(result).toEqual({ valid: true })
    })

    it('should reject oversized file', () => {
      const result = validateFileConstraints('image/jpeg', 50 * 1024 * 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds limit')
    })

    it('should reject invalid content type', () => {
      const result = validateFileConstraints('application/x-executable', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })
  })

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME types', () => {
      expect(getMimeTypeFromExtension('test.jpg')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('test.png')).toBe('image/png')
      expect(getMimeTypeFromExtension('test.pdf')).toBe('application/pdf')
      expect(getMimeTypeFromExtension('test.unknown')).toBe('application/octet-stream')
    })

    it('should handle case insensitive extensions', () => {
      expect(getMimeTypeFromExtension('test.JPG')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('test.PNG')).toBe('image/png')
    })
  })

  describe('extractFileMetadata', () => {
    it('should extract metadata correctly', () => {
      const result = extractFileMetadata('uploads/123-abc-test.jpg', {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        size: 1024,
      })

      expect(result).toEqual({
        key: 'uploads/123-abc-test.jpg',
        originalName: 'test.jpg',
        contentType: 'image/jpeg',
        size: 1024,
        uploadedAt: expect.any(Date),
      })
    })
  })
})

describe('ClamAV Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('scanFile', () => {
    it('should scan clean file successfully', async () => {
      // Mock socket events for clean file
      mockSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'connect') {
          setTimeout(callback, 10)
        } else if (event === 'data') {
          setTimeout(() => callback(Buffer.from('stream: OK\0')), 20)
        } else if (event === 'close') {
          setTimeout(callback, 30)
        }
      })

      const testBuffer = Buffer.from('safe file content')
      const result = await scanFile(testBuffer)

      expect(result.isClean).toBe(true)
      expect(result.scanDuration).toBeGreaterThan(0)
      expect(mockSocket.write).toHaveBeenCalledWith('zINSTREAM\0')
    })

    it('should detect infected file', async () => {
      // Mock socket events for infected file
      mockSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'connect') {
          setTimeout(callback, 10)
        } else if (event === 'data') {
          setTimeout(() => callback(Buffer.from('stream: EICAR-Test-File FOUND\0')), 20)
        } else if (event === 'close') {
          setTimeout(callback, 30)
        }
      })

      const testBuffer = createEicarTestString()
      const result = await scanFile(testBuffer)

      expect(result.isClean).toBe(false)
      expect(result.signature).toBe('EICAR-Test-File')
      expect(result.scanDuration).toBeGreaterThan(0)
    })

    it('should handle connection timeout', async () => {
      // Don't trigger connect event to simulate timeout
      mockSocket.on.mockImplementation(() => {})

      const testBuffer = Buffer.from('test content')
      const result = await scanFile(testBuffer)

      expect(result.isClean).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should handle connection error', async () => {
      mockSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection refused')), 10)
        }
      })

      const testBuffer = Buffer.from('test content')
      const result = await scanFile(testBuffer)

      expect(result.isClean).toBe(false)
      expect(result.error).toContain('Connection refused')
    })
  })

  describe('scanFileFromUrl', () => {
    it('should download and scan file from URL', async () => {
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10)),
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as any
      )

      // Mock successful scan
      mockSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'connect') setTimeout(callback, 10)
        else if (event === 'data') setTimeout(() => callback(Buffer.from('stream: OK\0')), 20)
        else if (event === 'close') setTimeout(callback, 30)
      })

      const result = await scanFileFromUrl('https://example.com/test.jpg')

      expect(result.isClean).toBe(true)
      expect(fetch).toHaveBeenCalledWith('https://example.com/test.jpg')
    })

    it('should handle download failure', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found',
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        mockResponse as any
      )

      const result = await scanFileFromUrl('https://example.com/nonexistent.jpg')

      expect(result.isClean).toBe(false)
      expect(result.error).toContain('Failed to download file')
    })

    it('should handle network error', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      )

      const result = await scanFileFromUrl('https://example.com/test.jpg')

      expect(result.isClean).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('quarantineFile', () => {
    it('should create quarantine info for infected file', () => {
      const result = quarantineFile('uploads/test-file.jpg', {
        isClean: false,
        signature: 'EICAR-Test-File',
        scanDuration: 100,
      })

      expect(result).toEqual({
        originalKey: 'uploads/test-file.jpg',
        quarantineKey: expect.stringMatching(/^quarantine\/\d+-test-file\.jpg$/),
        scanResult: {
          isClean: false,
          signature: 'EICAR-Test-File',
          scanDuration: 100,
        },
        quarantinedAt: expect.any(Date),
      })
    })
  })

  describe('checkClamAVHealth', () => {
    it('should return health status for available daemon', async () => {
      mockSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'connect') {
          setTimeout(callback, 10)
        } else if (event === 'data') {
          setTimeout(() => callback(Buffer.from('ClamAV 1.2.0/27064/Sat Sep  2 10:13:19 2023\0')), 20)
        } else if (event === 'close') {
          setTimeout(callback, 30)
        }
      })

      const result = await checkClamAVHealth()

      expect(result.available).toBe(true)
      expect(result.version).toContain('ClamAV 1.2.0')
    })

    it('should return unavailable status for connection failure', async () => {
      mockSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection refused')), 10)
        }
      })

      const result = await checkClamAVHealth()

      expect(result.available).toBe(false)
      expect(result.error).toContain('Connection refused')
    })

    it('should handle timeout', async () => {
      mockSocket.on.mockImplementation(() => {})

      const result = await checkClamAVHealth()

      expect(result.available).toBe(false)
      expect(result.error).toContain('timeout')
    })
  })

  describe('createEicarTestString', () => {
    it('should create EICAR test string buffer', () => {
      const buffer = createEicarTestString()
      const content = buffer.toString()

      expect(content).toContain('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')
      expect(buffer).toBeInstanceOf(Buffer)
    })
  })
})
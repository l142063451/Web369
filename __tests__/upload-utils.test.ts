import { validateFileType, validateFileSize, getMimeTypeFromExtension } from '@/lib/uploads/presign'

describe('Upload Utilities', () => {
  describe('validateFileType', () => {
    it('should allow image files', () => {
      expect(validateFileType('test.jpg')).toBe(true)
      expect(validateFileType('test.png')).toBe(true)
      expect(validateFileType('test.gif')).toBe(true)
      expect(validateFileType('test.webp')).toBe(true)
      expect(validateFileType('test.svg')).toBe(true)
    })

    it('should allow document files', () => {
      expect(validateFileType('test.pdf')).toBe(true)
      expect(validateFileType('test.doc')).toBe(true)
      expect(validateFileType('test.docx')).toBe(true)
      expect(validateFileType('test.txt')).toBe(true)
      expect(validateFileType('test.md')).toBe(true)
    })

    it('should allow other supported files', () => {
      expect(validateFileType('test.zip')).toBe(true)
      expect(validateFileType('test.csv')).toBe(true)
      expect(validateFileType('test.json')).toBe(true)
    })

    it('should reject unsupported file types', () => {
      expect(validateFileType('test.exe')).toBe(false)
      expect(validateFileType('test.bat')).toBe(false)
      expect(validateFileType('test.sh')).toBe(false)
      expect(validateFileType('malicious.php')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(validateFileType('TEST.JPG')).toBe(true)
      expect(validateFileType('Document.PDF')).toBe(true)
      expect(validateFileType('SCRIPT.EXE')).toBe(false)
    })
  })

  describe('validateFileSize', () => {
    it('should allow files under the limit', () => {
      expect(validateFileSize(1024)).toBe(true) // 1KB
      expect(validateFileSize(1024 * 1024)).toBe(true) // 1MB
      expect(validateFileSize(10 * 1024 * 1024)).toBe(true) // 10MB
    })

    it('should reject files over the limit', () => {
      const maxSize = 50 * 1024 * 1024 // 50MB
      expect(validateFileSize(maxSize + 1)).toBe(false)
      expect(validateFileSize(100 * 1024 * 1024)).toBe(false) // 100MB
    })

    it('should allow exactly the max size', () => {
      const maxSize = 50 * 1024 * 1024 // 50MB
      expect(validateFileSize(maxSize)).toBe(true)
    })
  })

  describe('getMimeTypeFromExtension', () => {
    it('should return correct MIME types for images', () => {
      expect(getMimeTypeFromExtension('test.jpg')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('test.jpeg')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('test.png')).toBe('image/png')
      expect(getMimeTypeFromExtension('test.gif')).toBe('image/gif')
      expect(getMimeTypeFromExtension('test.webp')).toBe('image/webp')
      expect(getMimeTypeFromExtension('test.svg')).toBe('image/svg+xml')
    })

    it('should return correct MIME types for documents', () => {
      expect(getMimeTypeFromExtension('test.pdf')).toBe('application/pdf')
      expect(getMimeTypeFromExtension('test.txt')).toBe('text/plain')
      expect(getMimeTypeFromExtension('test.md')).toBe('text/markdown')
      expect(getMimeTypeFromExtension('test.csv')).toBe('text/csv')
      expect(getMimeTypeFromExtension('test.json')).toBe('application/json')
    })

    it('should return default MIME type for unknown extensions', () => {
      expect(getMimeTypeFromExtension('test.unknown')).toBe('application/octet-stream')
      expect(getMimeTypeFromExtension('test')).toBe('application/octet-stream')
    })

    it('should be case insensitive', () => {
      expect(getMimeTypeFromExtension('TEST.PNG')).toBe('image/png')
      expect(getMimeTypeFromExtension('Document.PDF')).toBe('application/pdf')
    })
  })
})
/**
 * Content Management Tests
 * Tests for content service, API routes, and components
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock Prisma client
const mockPrisma = {
  page: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  media: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
}

// Mock the entire db module before importing the service
jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: mockPrisma,
}))

// Mock audit logger
const mockAuditCreate = jest.fn()
const mockAuditUpdate = jest.fn()
const mockAuditDelete = jest.fn()

jest.mock('@/lib/auth/audit-logger', () => ({
  createAuditLog: jest.fn(),
  auditCreate: mockAuditCreate,
  auditUpdate: mockAuditUpdate,
  auditDelete: mockAuditDelete,
}))

// Mock DOMPurify
const mockSanitize = jest.fn((html: string) => html)
jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: mockSanitize,
  },
}))

// Import after mocks are set up
import { ContentService, MediaService } from '@/lib/content/service'

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createPage', () => {
    it('should create a new page with valid data', async () => {
      const mockPage = {
        id: 'page-1',
        slug: 'test-page',
        title: 'Test Page',
        locale: 'en',
        status: 'DRAFT',
        blocks: [],
        seo: {},
        version: 1,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.page.findUnique.mockResolvedValue(null)
      mockPrisma.page.create.mockResolvedValue(mockPage)

      const result = await ContentService.createPage(
        {
          slug: 'test-page',
          title: 'Test Page',
          locale: 'en',
          blocks: [],
        },
        'user-1'
      )

      expect(result).toEqual(mockPage)
      expect(mockPrisma.page.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-page' },
      })
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: {
          slug: 'test-page',
          title: 'Test Page',
          locale: 'en',
          blocks: [],
          seo: {},
          createdBy: 'user-1',
          updatedBy: 'user-1',
          status: 'DRAFT',
          version: 1,
        },
      })
      expect(mockAuditCreate).toHaveBeenCalledWith('user-1', 'page', 'page-1', {
        slug: 'test-page',
        title: 'Test Page',
        status: 'DRAFT',
      })
    })

    it('should throw error for duplicate slug', async () => {
      mockPrisma.page.findUnique.mockResolvedValue({ id: 'existing-page' })

      await expect(
        ContentService.createPage(
          {
            slug: 'test-page',
            title: 'Test Page',
            locale: 'en',
          },
          'user-1'
        )
      ).rejects.toThrow('Page with this slug already exists')
    })

    it('should sanitize content blocks', async () => {
      const mockPage = {
        id: 'page-1',
        slug: 'test-page',
        title: 'Test Page',
        locale: 'en',
        status: 'DRAFT',
        blocks: [{
          id: 'section-1',
          title: 'Section 1',
          blocks: [{
            id: 'block-1',
            type: 'paragraph',
            content: { html: '<script>alert("xss")</script><p>Safe content</p>' },
            order: 0,
          }],
          order: 0,
        }],
        seo: {},
        version: 1,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.page.findUnique.mockResolvedValue(null)
      mockPrisma.page.create.mockResolvedValue(mockPage)

      await ContentService.createPage(
        {
          slug: 'test-page',
          title: 'Test Page',
          blocks: [{
            id: 'section-1',
            title: 'Section 1',
            blocks: [{
              id: 'block-1',
              type: 'paragraph',
              content: { html: '<script>alert("xss")</script><p>Safe content</p>' },
              order: 0,
            }],
            order: 0,
          }],
        },
        'user-1'
      )

      expect(mockSanitize).toHaveBeenCalledWith(
        '<script>alert("xss")</script><p>Safe content</p>',
        {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'span'],
          ALLOWED_ATTR: ['href', 'target', 'class'],
        }
      )
    })
  })

  describe('updatePage', () => {
    it('should update page with valid data', async () => {
      const currentPage = {
        id: 'page-1',
        title: 'Old Title',
        status: 'DRAFT',
        blocks: [],
      }

      const updatedPage = {
        ...currentPage,
        title: 'New Title',
        status: 'PUBLISHED',
        updatedAt: new Date(),
      }

      mockPrisma.page.findUnique.mockResolvedValue(currentPage)
      mockPrisma.page.update.mockResolvedValue(updatedPage)

      const result = await ContentService.updatePage(
        'page-1',
        {
          title: 'New Title',
          status: 'PUBLISHED',
        },
        'user-1'
      )

      expect(result).toEqual(updatedPage)
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: expect.objectContaining({
          title: 'New Title',
          status: 'PUBLISHED',
          updatedBy: 'user-1',
          publishedAt: expect.any(Date),
        }),
      })
      expect(mockAuditUpdate).toHaveBeenCalled()
    })

    it('should throw error for non-existent page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null)

      await expect(
        ContentService.updatePage('page-1', { title: 'New Title' }, 'user-1')
      ).rejects.toThrow('Page not found')
    })
  })

  describe('getPageBySlug', () => {
    it('should return page by slug', async () => {
      const mockPage = {
        id: 'page-1',
        slug: 'test-page',
        title: 'Test Page',
        status: 'PUBLISHED',
      }

      mockPrisma.page.findFirst.mockResolvedValue(mockPage)

      const result = await ContentService.getPageBySlug('test-page')

      expect(result).toEqual(mockPage)
      expect(mockPrisma.page.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'test-page',
          locale: 'en',
          status: 'PUBLISHED',
        },
      })
    })

    it('should include unpublished pages when requested', async () => {
      const mockPage = {
        id: 'page-1',
        slug: 'test-page',
        title: 'Test Page',
        status: 'DRAFT',
      }

      mockPrisma.page.findFirst.mockResolvedValue(mockPage)

      const result = await ContentService.getPageBySlug(
        'test-page',
        'en',
        true
      )

      expect(result).toEqual(mockPage)
      expect(mockPrisma.page.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'test-page',
          locale: 'en',
        },
      })
    })
  })

  describe('listPages', () => {
    it('should list pages with pagination', async () => {
      const mockPages = [
        { id: 'page-1', title: 'Page 1' },
        { id: 'page-2', title: 'Page 2' },
      ]

      mockPrisma.page.findMany.mockResolvedValue(mockPages)
      mockPrisma.page.count.mockResolvedValue(2)

      const result = await ContentService.listPages({
        limit: 10,
        offset: 0,
      })

      expect(result).toEqual({
        pages: mockPages,
        total: 2,
      })
    })

    it('should filter by status', async () => {
      mockPrisma.page.findMany.mockResolvedValue([])
      mockPrisma.page.count.mockResolvedValue(0)

      await ContentService.listPages({
        status: 'PUBLISHED',
      })

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: {
          locale: 'en',
          status: 'PUBLISHED',
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        skip: 0,
      })
    })

    it('should search pages by title and slug', async () => {
      mockPrisma.page.findMany.mockResolvedValue([])
      mockPrisma.page.count.mockResolvedValue(0)

      await ContentService.listPages({
        search: 'test',
      })

      expect(mockPrisma.page.findMany).toHaveBeenCalledWith({
        where: {
          locale: 'en',
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { slug: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        skip: 0,
      })
    })
  })

  describe('deletePage', () => {
    it('should delete page and log audit', async () => {
      const mockPage = {
        id: 'page-1',
        slug: 'test-page',
        title: 'Test Page',
        status: 'DRAFT',
      }

      mockPrisma.page.findUnique.mockResolvedValue(mockPage)
      mockPrisma.page.delete.mockResolvedValue(mockPage)

      await ContentService.deletePage('page-1', 'user-1')

      expect(mockPrisma.page.delete).toHaveBeenCalledWith({
        where: { id: 'page-1' },
      })
      expect(mockAuditDelete).toHaveBeenCalledWith('user-1', 'page', 'page-1', {
        slug: 'test-page',
        title: 'Test Page',
        status: 'DRAFT',
      })
    })

    it('should throw error for non-existent page', async () => {
      mockPrisma.page.findUnique.mockResolvedValue(null)

      await expect(
        ContentService.deletePage('page-1', 'user-1')
      ).rejects.toThrow('Page not found')
    })
  })

  describe('duplicatePage', () => {
    it('should duplicate page with new slug', async () => {
      const sourcePage = {
        id: 'page-1',
        slug: 'original-page',
        title: 'Original Page',
        locale: 'en',
        blocks: [{ id: 'block-1', content: 'test' }],
        seo: { title: 'Original' },
      }

      const duplicatedPage = {
        id: 'page-2',
        slug: 'duplicate-page',
        title: 'Original Page (Copy)',
        status: 'DRAFT',
        version: 1,
      }

      mockPrisma.page.findUnique
        .mockResolvedValueOnce(sourcePage) // source page lookup
        .mockResolvedValueOnce(null) // new slug check
      mockPrisma.page.create.mockResolvedValue(duplicatedPage)

      const result = await ContentService.duplicatePage(
        'page-1',
        'duplicate-page',
        'user-1'
      )

      expect(result).toEqual(duplicatedPage)
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: {
          slug: 'duplicate-page',
          title: 'Original Page (Copy)',
          locale: 'en',
          blocks: [{ id: 'block-1', content: 'test' }],
          seo: { title: 'Original' },
          createdBy: 'user-1',
          updatedBy: 'user-1',
          status: 'DRAFT',
          version: 1,
        },
      })
    })
  })
})

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createMedia', () => {
    it('should create media record', async () => {
      const mockMedia = {
        id: 'media-1',
        url: 'https://example.com/image.jpg',
        alt: 'Test image',
        caption: 'Test caption',
        meta: { size: 1024 },
        createdBy: 'user-1',
        isPublic: false,
        createdAt: new Date(),
      }

      mockPrisma.media.create.mockResolvedValue(mockMedia)

      const result = await MediaService.createMedia({
        url: 'https://example.com/image.jpg',
        alt: 'Test image',
        caption: 'Test caption',
        meta: { size: 1024 },
        createdBy: 'user-1',
      })

      expect(result).toEqual(mockMedia)
      expect(mockPrisma.media.create).toHaveBeenCalledWith({
        data: {
          url: 'https://example.com/image.jpg',
          alt: 'Test image',
          caption: 'Test caption',
          meta: { size: 1024 },
          createdBy: 'user-1',
          isPublic: false,
        },
      })
      expect(mockAuditCreate).toHaveBeenCalledWith('user-1', 'media', 'media-1', {
        url: 'https://example.com/image.jpg',
        alt: 'Test image',
        caption: 'Test caption',
      })
    })
  })

  describe('markMediaScanned', () => {
    it('should mark media as clean after scan', async () => {
      const mockMedia = {
        id: 'media-1',
        isPublic: true,
        scannedAt: new Date(),
        meta: {
          scanResult: { isClean: true },
        },
      }

      mockPrisma.media.update.mockResolvedValue(mockMedia)

      const result = await MediaService.markMediaScanned('media-1', {
        isClean: true,
      })

      expect(result).toEqual(mockMedia)
      expect(mockPrisma.media.update).toHaveBeenCalledWith({
        where: { id: 'media-1' },
        data: {
          scannedAt: expect.any(Date),
          isPublic: true,
          meta: {
            scanResult: { isClean: true },
          },
        },
      })
    })

    it('should mark media as quarantined if infected', async () => {
      const mockMedia = {
        id: 'media-1',
        isPublic: false,
        scannedAt: new Date(),
        meta: {
          scanResult: { isClean: false, signature: 'EICAR-Test' },
        },
      }

      mockPrisma.media.update.mockResolvedValue(mockMedia)

      const result = await MediaService.markMediaScanned('media-1', {
        isClean: false,
        signature: 'EICAR-Test',
      })

      expect(result).toEqual(mockMedia)
      expect(mockPrisma.media.update).toHaveBeenCalledWith({
        where: { id: 'media-1' },
        data: {
          scannedAt: expect.any(Date),
          isPublic: false,
          meta: {
            scanResult: { isClean: false, signature: 'EICAR-Test' },
          },
        },
      })
    })
  })

  describe('listMedia', () => {
    it('should list media files with pagination', async () => {
      const mockMedia = [
        { id: 'media-1', url: 'image1.jpg' },
        { id: 'media-2', url: 'image2.jpg' },
      ]

      mockPrisma.media.findMany.mockResolvedValue(mockMedia)
      mockPrisma.media.count.mockResolvedValue(2)

      const result = await MediaService.listMedia({
        limit: 10,
        offset: 0,
      })

      expect(result).toEqual({
        media: mockMedia,
        total: 2,
      })
    })

    it('should filter by public status', async () => {
      mockPrisma.media.findMany.mockResolvedValue([])
      mockPrisma.media.count.mockResolvedValue(0)

      await MediaService.listMedia({
        isPublic: true,
      })

      expect(mockPrisma.media.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      })
    })
  })
})
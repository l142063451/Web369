/**
 * Content Service Tests
 * Tests for content management functionality
 */

import { ContentService, MediaService } from '@/lib/content/service'

// Mock the dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    page: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    media: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/audit-logger', () => ({
  auditCreate: jest.fn(),
  auditUpdate: jest.fn(),
  auditDelete: jest.fn(),
}))

import { prisma } from '@/lib/db'
import { auditCreate, auditUpdate, auditDelete } from '@/lib/auth/audit-logger'

describe('ContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createPage', () => {
    it('should create a new page successfully', async () => {
      const mockPage = {
        id: 'page-1',
        slug: 'test-page',
        title: 'Test Page',
        status: 'DRAFT',
        locale: 'en',
        blocks: [],
        seo: {},
        version: 1,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
      }

      ;(prisma.page.findUnique as jest.Mock).mockResolvedValue(null) // No existing page
      ;(prisma.page.create as jest.Mock).mockResolvedValue(mockPage)

      const result = await ContentService.createPage(
        {
          slug: 'test-page',
          title: 'Test Page',
          locale: 'en',
          blocks: [],
        },
        'user-1'
      )

      expect(prisma.page.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-page' },
      })
      
      expect(prisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: 'test-page',
          title: 'Test Page',
          locale: 'en',
          status: 'DRAFT',
          version: 1,
          createdBy: 'user-1',
          updatedBy: 'user-1',
        }),
      })

      expect(auditCreate).toHaveBeenCalledWith('user-1', 'page', mockPage.id, {
        slug: mockPage.slug,
        title: mockPage.title,
        status: mockPage.status,
      })

      expect(result).toEqual(mockPage)
    })

    it('should throw error if slug already exists', async () => {
      ;(prisma.page.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-page' })

      await expect(
        ContentService.createPage(
          { slug: 'existing-slug', title: 'Test', locale: 'en', blocks: [] },
          'user-1'
        )
      ).rejects.toThrow('Page with this slug already exists')
    })

    it('should validate and sanitize blocks', async () => {
      const mockPage = { id: 'page-1', slug: 'test' }
      ;(prisma.page.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.page.create as jest.Mock).mockResolvedValue(mockPage)

      const blocksWithHtml = [
        {
          id: 'section-1',
          title: 'Test Section',
          order: 1,
          blocks: [
            {
              id: 'block-1',
              type: 'paragraph' as const,
              content: { html: '<script>alert("xss")</script><p>Safe content</p>' },
              order: 1,
            },
          ],
        },
      ]

      await ContentService.createPage(
        {
          slug: 'test-page',
          title: 'Test Page',
          locale: 'en',
          blocks: blocksWithHtml,
        },
        'user-1'
      )

      expect(prisma.page.create).toHaveBeenCalled()
      const createCall = (prisma.page.create as jest.Mock).mock.calls[0][0]
      const sanitizedBlocks = createCall.data.blocks

      // Check that script tag was removed but safe content remained
      expect(sanitizedBlocks[0].blocks[0].content.html).not.toContain('<script>')
      expect(sanitizedBlocks[0].blocks[0].content.html).toContain('<p>Safe content</p>')
    })
  })

  describe('updatePage', () => {
    it('should update page successfully', async () => {
      const currentPage = {
        id: 'page-1',
        title: 'Old Title',
        status: 'DRAFT',
        blocks: [],
        seo: {},
      }
      
      const updatedPage = {
        ...currentPage,
        title: 'New Title',
        status: 'PUBLISHED',
      }

      ;(prisma.page.findUnique as jest.Mock).mockResolvedValue(currentPage)
      ;(prisma.page.update as jest.Mock).mockResolvedValue(updatedPage)

      const result = await ContentService.updatePage(
        'page-1',
        { title: 'New Title', status: 'PUBLISHED' },
        'user-1'
      )

      expect(auditUpdate).toHaveBeenCalledWith(
        'user-1',
        'page',
        'page-1',
        expect.objectContaining({ title: 'Old Title' }),
        expect.objectContaining({ title: 'New Title' })
      )

      expect(result).toEqual(updatedPage)
    })

    it('should throw error if page not found', async () => {
      ;(prisma.page.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        ContentService.updatePage('nonexistent', { title: 'Test' }, 'user-1')
      ).rejects.toThrow('Page not found')
    })
  })

  describe('getPageBySlug', () => {
    it('should return published page by slug', async () => {
      const mockPage = { id: 'page-1', slug: 'test', status: 'PUBLISHED' }
      ;(prisma.page.findFirst as jest.Mock).mockResolvedValue(mockPage)

      const result = await ContentService.getPageBySlug('test', 'en')

      expect(prisma.page.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'test',
          locale: 'en',
          status: 'PUBLISHED',
        },
      })
      
      expect(result).toEqual(mockPage)
    })

    it('should include unpublished pages when specified', async () => {
      const mockPage = { id: 'page-1', slug: 'test', status: 'DRAFT' }
      ;(prisma.page.findFirst as jest.Mock).mockResolvedValue(mockPage)

      await ContentService.getPageBySlug('test', 'en', true)

      expect(prisma.page.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'test',
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
      
      ;(prisma.page.findMany as jest.Mock).mockResolvedValue(mockPages)
      ;(prisma.page.count as jest.Mock).mockResolvedValue(10)

      const result = await ContentService.listPages({
        limit: 2,
        offset: 0,
        locale: 'en',
      })

      expect(result).toEqual({
        pages: mockPages,
        total: 10,
      })

      expect(prisma.page.findMany).toHaveBeenCalledWith({
        where: { locale: 'en' },
        orderBy: { updatedAt: 'desc' },
        take: 2,
        skip: 0,
      })
    })

    it('should filter by status and search term', async () => {
      await ContentService.listPages({
        status: 'PUBLISHED' as any,
        search: 'test',
        locale: 'en',
      })

      expect(prisma.page.findMany).toHaveBeenCalledWith({
        where: {
          locale: 'en',
          status: 'PUBLISHED',
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
    it('should delete page and audit the action', async () => {
      const mockPage = { id: 'page-1', slug: 'test', title: 'Test Page', status: 'DRAFT' }
      ;(prisma.page.findUnique as jest.Mock).mockResolvedValue(mockPage)

      await ContentService.deletePage('page-1', 'user-1')

      expect(prisma.page.delete).toHaveBeenCalledWith({
        where: { id: 'page-1' },
      })

      expect(auditDelete).toHaveBeenCalledWith('user-1', 'page', 'page-1', {
        slug: mockPage.slug,
        title: mockPage.title,
        status: mockPage.status,
      })
    })
  })

  describe('duplicatePage', () => {
    it('should duplicate page with new slug', async () => {
      const sourcePage = {
        id: 'page-1',
        slug: 'original',
        title: 'Original Page',
        locale: 'en',
        blocks: [],
        seo: {},
      }

      const duplicatedPage = {
        id: 'page-2',
        slug: 'copy',
        title: 'Original Page (Copy)',
      }

      ;(prisma.page.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourcePage) // Source page exists
        .mockResolvedValueOnce(null) // New slug doesn't exist

      ;(prisma.page.create as jest.Mock).mockResolvedValue(duplicatedPage)

      const result = await ContentService.duplicatePage('page-1', 'copy', 'user-1')

      expect(result).toEqual(duplicatedPage)
      expect(auditCreate).toHaveBeenCalledWith('user-1', 'page', duplicatedPage.id, {
        slug: duplicatedPage.slug,
        title: duplicatedPage.title,
        sourceId: 'page-1',
        duplicated: true,
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
        url: 'https://example.com/file.jpg',
        alt: 'Test image',
        caption: 'Test caption',
        isPublic: false,
      }

      ;(prisma.media.create as jest.Mock).mockResolvedValue(mockMedia)

      const result = await MediaService.createMedia({
        url: 'https://example.com/file.jpg',
        alt: 'Test image',
        meta: { size: 1024 },
        createdBy: 'user-1',
      })

      expect(result).toEqual(mockMedia)
      expect(auditCreate).toHaveBeenCalledWith('user-1', 'media', mockMedia.id, {
        url: mockMedia.url,
        alt: mockMedia.alt,
        caption: mockMedia.caption,
      })
    })
  })

  describe('markMediaScanned', () => {
    it('should update media with scan results', async () => {
      const scannedMedia = {
        id: 'media-1',
        isPublic: true,
        scannedAt: new Date(),
      }

      ;(prisma.media.update as jest.Mock).mockResolvedValue(scannedMedia)

      const result = await MediaService.markMediaScanned('media-1', {
        isClean: true,
      })

      expect(prisma.media.update).toHaveBeenCalledWith({
        where: { id: 'media-1' },
        data: {
          scannedAt: expect.any(Date),
          isPublic: true,
          meta: {
            scanResult: { isClean: true },
          },
        },
      })

      expect(result).toEqual(scannedMedia)
    })
  })

  describe('listMedia', () => {
    it('should list media files with filtering', async () => {
      const mockMedia = [
        { id: 'media-1', isPublic: true },
        { id: 'media-2', isPublic: true },
      ]

      ;(prisma.media.findMany as jest.Mock).mockResolvedValue(mockMedia)
      ;(prisma.media.count as jest.Mock).mockResolvedValue(2)

      const result = await MediaService.listMedia({ isPublic: true })

      expect(result).toEqual({
        media: mockMedia,
        total: 2,
      })

      expect(prisma.media.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      })
    })
  })
})
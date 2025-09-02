/**
 * Content Management Service Layer
 * Based on REQUIREMENTS_AND_GOALS.md §8 and INSTRUCTIONS_FOR_COPILOT.md §6
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import DOMPurify from 'isomorphic-dompurify'
import { createAuditLog, auditCreate, auditUpdate, auditDelete } from '@/lib/auth/audit-logger'

// Import types - these will be available once Prisma generates
type PageStatus = 'DRAFT' | 'STAGED' | 'PUBLISHED'

interface Page {
  id: string
  slug: string
  title: string
  locale: string
  status: PageStatus
  blocks: any
  seo: any
  version: number
  createdBy: string
  updatedBy: string
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface Media {
  id: string
  url: string
  alt?: string
  caption?: string
  meta: any
  scannedAt?: Date
  isPublic: boolean
  createdBy: string
  createdAt: Date
}

// Content Block Schema
const BlockSchema = z.object({
  id: z.string(),
  type: z.enum(['heading', 'paragraph', 'image', 'video', 'embed', 'table', 'list']),
  content: z.record(z.unknown()),
  order: z.number(),
  settings: z.record(z.unknown()).optional(),
})

const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  blocks: z.array(BlockSchema),
  order: z.number(),
  settings: z.record(z.unknown()).optional(),
})

const PageBlocksSchema = z.array(SectionSchema)

// SEO Schema
const SEOSchema = z.object({
  title: z.string().max(60).optional(),
  description: z.string().max(160).optional(),
  keywords: z.array(z.string()).optional(),
  ogTitle: z.string().max(60).optional(),
  ogDescription: z.string().max(160).optional(),
  ogImage: z.string().url().optional(),
  canonical: z.string().url().optional(),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
})

// Content Validation Schemas
const CreatePageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  locale: z.string().length(2).default('en'),
  blocks: PageBlocksSchema.default([]),
  seo: SEOSchema.optional(),
})

const UpdatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  blocks: PageBlocksSchema.optional(),
  seo: SEOSchema.optional(),
  status: z.enum(['DRAFT', 'STAGED', 'PUBLISHED']).optional(),
})

// Export types
export type ContentBlock = z.infer<typeof BlockSchema>
export type ContentSection = z.infer<typeof SectionSchema>
export type PageBlocks = z.infer<typeof PageBlocksSchema>
export type SEOData = z.infer<typeof SEOSchema>
export type CreatePageRequest = z.infer<typeof CreatePageSchema>
export type UpdatePageRequest = z.infer<typeof UpdatePageSchema>

// Content Service Class
export class ContentService {
  /**
   * Create new page
   */
  static async createPage(
    data: CreatePageRequest,
    createdBy: string
  ): Promise<Page> {
    const validated = CreatePageSchema.parse(data)
    
    // Check if slug already exists
    const existingPage = await prisma.page.findUnique({
      where: { slug: validated.slug },
    })
    
    if (existingPage) {
      throw new Error('Page with this slug already exists')
    }
    
    // Sanitize blocks content
    const sanitizedBlocks = this.sanitizeBlocks(validated.blocks)
    
    const page = await prisma.page.create({
      data: {
        slug: validated.slug,
        title: validated.title,
        locale: validated.locale,
        blocks: sanitizedBlocks as any,
        seo: validated.seo || {},
        createdBy,
        updatedBy: createdBy,
        status: 'DRAFT' as PageStatus,
        version: 1,
      },
    })
    
    // Log audit
    await auditCreate(createdBy, 'page', page.id, {
      slug: page.slug,
      title: page.title,
      status: page.status,
    })
    
    return page
  }
  
  /**
   * Update existing page
   */
  static async updatePage(
    pageId: string,
    data: UpdatePageRequest,
    updatedBy: string
  ): Promise<Page> {
    const validated = UpdatePageSchema.parse(data)
    
    // Get current page for audit
    const currentPage = await prisma.page.findUnique({
      where: { id: pageId },
    })
    
    if (!currentPage) {
      throw new Error('Page not found')
    }
    
    // Prepare update data
    const updateData: any = {
      updatedBy,
      updatedAt: new Date(),
    }
    
    if (validated.title) {
      updateData.title = validated.title
    }
    
    if (validated.blocks) {
      updateData.blocks = this.sanitizeBlocks(validated.blocks)
    }
    
    if (validated.seo) {
      updateData.seo = validated.seo
    }
    
    if (validated.status) {
      updateData.status = validated.status
      
      // Set publishedAt when publishing
      if (validated.status === 'PUBLISHED' && currentPage.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date()
      }
    }
    
    // Update page
    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: updateData,
    })
    
    // Log audit with diff
    await auditUpdate(updatedBy, 'page', pageId, 
      { title: currentPage.title, status: currentPage.status, blocks: currentPage.blocks },
      { title: updatedPage.title, status: updatedPage.status, blocks: updatedPage.blocks }
    )
    
    return updatedPage
  }
  
  /**
   * Get page by slug
   */
  static async getPageBySlug(
    slug: string,
    locale = 'en',
    includeUnpublished = false
  ): Promise<Page | null> {
    return await prisma.page.findFirst({
      where: {
        slug,
        locale,
        ...(includeUnpublished ? {} : { status: 'PUBLISHED' as PageStatus }),
      },
    })
  }
  
  /**
   * Get page by ID
   */
  static async getPageById(pageId: string): Promise<Page | null> {
    return await prisma.page.findUnique({
      where: { id: pageId },
    })
  }
  
  /**
   * List pages with pagination
   */
  static async listPages(options: {
    status?: PageStatus
    locale?: string
    limit?: number
    offset?: number
    search?: string
  } = {}): Promise<{ pages: Page[]; total: number }> {
    const {
      status,
      locale = 'en',
      limit = 20,
      offset = 0,
      search,
    } = options
    
    const where: any = { locale }
    
    if (status) {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.page.count({ where }),
    ])
    
    return { pages, total }
  }
  
  /**
   * Delete page
   */
  static async deletePage(pageId: string, deletedBy: string): Promise<void> {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    })
    
    if (!page) {
      throw new Error('Page not found')
    }
    
    await prisma.page.delete({
      where: { id: pageId },
    })
    
    // Log audit
    await auditDelete(deletedBy, 'page', pageId, {
      slug: page.slug,
      title: page.title,
      status: page.status,
    })
  }
  
  /**
   * Duplicate page
   */
  static async duplicatePage(
    sourcePageId: string,
    newSlug: string,
    createdBy: string
  ): Promise<Page> {
    const sourcePage = await prisma.page.findUnique({
      where: { id: sourcePageId },
    })
    
    if (!sourcePage) {
      throw new Error('Source page not found')
    }
    
    // Check if new slug already exists
    const existingPage = await prisma.page.findUnique({
      where: { slug: newSlug },
    })
    
    if (existingPage) {
      throw new Error('Page with this slug already exists')
    }
    
    const duplicatedPage = await prisma.page.create({
      data: {
        slug: newSlug,
        title: `${sourcePage.title} (Copy)`,
        locale: sourcePage.locale,
        blocks: sourcePage.blocks,
        seo: sourcePage.seo,
        createdBy,
        updatedBy: createdBy,
        status: 'DRAFT' as PageStatus,
        version: 1,
      },
    })
    
    // Log audit
    await auditCreate(createdBy, 'page', duplicatedPage.id, {
      slug: duplicatedPage.slug,
      title: duplicatedPage.title,
      sourceId: sourcePageId,
      duplicated: true,
    })
    
    return duplicatedPage
  }
  
  /**
   * Sanitize content blocks
   */
  private static sanitizeBlocks(blocks: PageBlocks): PageBlocks {
    return blocks.map(section => ({
      ...section,
      blocks: section.blocks.map(block => ({
        ...block,
        content: this.sanitizeBlockContent(block.type, block.content),
      })),
    }))
  }
  
  /**
   * Sanitize individual block content based on type
   */
  private static sanitizeBlockContent(
    type: string,
    content: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = { ...content }
    
    // Sanitize HTML content in text blocks
    if (type === 'paragraph' || type === 'heading') {
      if (typeof sanitized.html === 'string') {
        sanitized.html = DOMPurify.sanitize(sanitized.html, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'span'],
          ALLOWED_ATTR: ['href', 'target', 'class'],
        })
      }
    }
    
    // Sanitize table content
    if (type === 'table' && typeof sanitized.html === 'string') {
      sanitized.html = DOMPurify.sanitize(sanitized.html, {
        ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ALLOWED_ATTR: ['class'],
      })
    }
    
    // Validate URLs in image and video blocks
    if ((type === 'image' || type === 'video') && typeof sanitized.src === 'string') {
      try {
        new URL(sanitized.src)
      } catch {
        delete sanitized.src
      }
    }
    
    return sanitized
  }
  
  /**
   * Calculate diff between page versions
   */
  private static calculatePageDiff(oldPage: Page, newPage: Page): Record<string, any> {
    const diff: Record<string, any> = {}
    
    if (oldPage.title !== newPage.title) {
      diff.title = { from: oldPage.title, to: newPage.title }
    }
    
    if (oldPage.status !== newPage.status) {
      diff.status = { from: oldPage.status, to: newPage.status }
    }
    
    if (JSON.stringify(oldPage.blocks) !== JSON.stringify(newPage.blocks)) {
      diff.blocks = { changed: true }
    }
    
    if (JSON.stringify(oldPage.seo) !== JSON.stringify(newPage.seo)) {
      diff.seo = { changed: true }
    }
    
    return diff
  }
}

// Media Service
export class MediaService {
  /**
   * Create media record after successful upload
   */
  static async createMedia(data: {
    url: string
    alt?: string
    caption?: string
    meta: Record<string, unknown>
    createdBy: string
  }): Promise<Media> {
    const media = await prisma.media.create({
      data: {
        url: data.url,
        alt: data.alt || '',
        caption: data.caption || '',
        meta: data.meta,
        createdBy: data.createdBy,
        isPublic: false, // Will be set to true after ClamAV scan
      },
    })
    
    // Log audit
    await auditCreate(data.createdBy, 'media', media.id, {
      url: media.url,
      alt: media.alt,
      caption: media.caption,
    })
    
    return media
  }
  
  /**
   * Mark media as scanned and safe
   */
  static async markMediaScanned(
    mediaId: string,
    scanResult: { isClean: boolean; signature?: string }
  ): Promise<Media> {
    const media = await prisma.media.update({
      where: { id: mediaId },
      data: {
        scannedAt: new Date(),
        isPublic: scanResult.isClean,
        meta: {
          scanResult,
        },
      },
    })
    
    return media
  }
  
  /**
   * List media files
   */
  static async listMedia(options: {
    isPublic?: boolean
    limit?: number
    offset?: number
  } = {}): Promise<{ media: Media[]; total: number }> {
    const { isPublic, limit = 20, offset = 0 } = options
    
    const where = isPublic !== undefined ? { isPublic } : {}
    
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.media.count({ where }),
    ])
    
    return { media, total }
  }
}
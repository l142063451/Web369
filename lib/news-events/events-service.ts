/**
 * Events Service Layer for PR12 - News/Notices/Events
 * Implements events calendar with RSVP, reminders, and ICS export
 */

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/auth/audit-logger'

// Type definitions
export type RSVPStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED'

export interface Event {
  id: string
  title: string
  start: Date
  end: Date
  location?: string
  rsvpEnabled: boolean
  description?: string
  attachments: string[]
  createdAt: Date
  updatedAt: Date
  rsvps?: EventRSVP[]
}

export interface EventRSVP {
  id: string
  eventId: string
  userId?: string
  name: string
  email: string
  phone?: string
  status: RSVPStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Validation schemas
// Base schema without refinement
const CreateEventBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  start: z.date(),
  end: z.date(),
  location: z.string().max(200, 'Location too long').optional(),
  rsvpEnabled: z.boolean().default(false),
  description: z.string().max(2000, 'Description too long').optional(),
  attachments: z.array(z.string().url()).default([])
})

export const CreateEventSchema = CreateEventBaseSchema.refine(data => data.end > data.start, {
  message: 'End time must be after start time',
  path: ['end']
})

export const UpdateEventSchema = CreateEventBaseSchema.partial().extend({
  id: z.string().cuid()
}).refine((data) => !data.start || !data.end || data.end > data.start, {
  message: 'End time must be after start time',
  path: ['end']
})

export const EventFiltersSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  location: z.string().optional(),
  rsvpEnabled: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10)
})

export const CreateRSVPSchema = z.object({
  eventId: z.string().cuid(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email'),
  phone: z.string().max(20, 'Phone too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional()
})

export const UpdateRSVPSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED']),
  notes: z.string().max(500, 'Notes too long').optional()
})

export class EventsService {
  /**
   * Create a new event
   */
  static async create(data: z.infer<typeof CreateEventSchema>, userId: string): Promise<Event> {
    const validated = CreateEventSchema.parse(data)

    const event = await prisma.event.create({
      data: validated,
      include: {
        rsvps: true
      }
    })

    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'Event',
      resourceId: event.id,
      actorId: userId,
      diff: { after: event }
    })

    return event as Event
  }

  /**
   * Update an existing event
   */
  static async update(data: z.infer<typeof UpdateEventSchema>, userId: string): Promise<Event> {
    const validated = UpdateEventSchema.parse(data)
    const { id, ...updateData } = validated

    const existingEvent = await prisma.event.findUnique({
      where: { id }
    })

    if (!existingEvent) {
      throw new Error('Event not found')
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        rsvps: true
      }
    })

    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'Event',
      resourceId: event.id,
      actorId: userId,
      diff: { before: existingEvent, after: event }
    })

    return event as Event
  }

  /**
   * Delete an event
   */
  static async delete(id: string, userId: string): Promise<void> {
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    })

    if (!existingEvent) {
      throw new Error('Event not found')
    }

    await prisma.event.delete({
      where: { id }
    })

    // Create audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'Event',
      resourceId: id,
      actorId: userId,
      diff: { before: existingEvent }
    })
  }

  /**
   * Get event by ID
   */
  static async getById(id: string): Promise<Event | null> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        rsvps: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return event as Event | null
  }

  /**
   * List events with filtering and pagination
   */
  static async list(filters: z.infer<typeof EventFiltersSchema>) {
    const validated = EventFiltersSchema.parse(filters)
    const { page, limit, startDate, endDate, location, rsvpEnabled, search } = validated

    const where: any = {}

    // Date range filter
    if (startDate) {
      where.start = { gte: startDate }
    }
    if (endDate) {
      where.end = { lte: endDate }
    }

    // Location filter
    if (location) {
      where.location = { contains: location, mode: 'insensitive' }
    }

    // RSVP enabled filter
    if (rsvpEnabled !== undefined) {
      where.rsvpEnabled = rsvpEnabled
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: [
          { start: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          rsvps: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.event.count({ where })
    ])

    return {
      events: events as Event[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get upcoming events
   */
  static async getUpcoming(page = 1, limit = 10) {
    return this.list({
      startDate: new Date(),
      page,
      limit
    })
  }

  /**
   * Get events in date range
   */
  static async getInDateRange(startDate: Date, endDate: Date, page = 1, limit = 50) {
    return this.list({
      startDate,
      endDate,
      page,
      limit
    })
  }

  /**
   * Generate ICS calendar data for an event
   */
  static generateICS(event: Event): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const escapeText = (text: string) => {
      return text.replace(/[\\;,\n]/g, (match) => {
        switch (match) {
          case '\\': return '\\\\'
          case ';': return '\\;'
          case ',': return '\\,'
          case '\n': return '\\n'
          default: return match
        }
      })
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ummid Se Hari//Event Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@ummid-se-hari.com`,
      `DTSTART:${formatDate(event.start)}`,
      `DTEND:${formatDate(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      `DTSTAMP:${formatDate(new Date())}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    return icsContent
  }

  /**
   * Get event statistics
   */
  static async getStats() {
    const now = new Date()
    const [totalEvents, upcomingEvents, totalRSVPs, confirmedRSVPs] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({
        where: { start: { gte: now } }
      }),
      prisma.eventRSVP.count(),
      prisma.eventRSVP.count({
        where: { status: 'CONFIRMED' }
      })
    ])

    return {
      totalEvents,
      upcomingEvents,
      totalRSVPs,
      confirmedRSVPs
    }
  }
}

export class RSVPService {
  /**
   * Create RSVP for an event
   */
  static async create(data: z.infer<typeof CreateRSVPSchema>, userId?: string): Promise<EventRSVP> {
    const validated = CreateRSVPSchema.parse(data)

    // Check if event exists and RSVP is enabled
    const event = await prisma.event.findUnique({
      where: { id: validated.eventId }
    })

    if (!event) {
      throw new Error('Event not found')
    }

    if (!event.rsvpEnabled) {
      throw new Error('RSVP is not enabled for this event')
    }

    // Check if RSVP already exists for this email
    const existingRSVP = await prisma.eventRSVP.findFirst({
      where: {
        eventId: validated.eventId,
        email: validated.email
      }
    })

    if (existingRSVP) {
      throw new Error('RSVP already exists for this email')
    }

    const rsvp = await prisma.eventRSVP.create({
      data: {
        ...validated,
        userId,
        status: 'PENDING'
      }
    })

    // Create audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        resource: 'EventRSVP',
        resourceId: rsvp.id,
        actorId: userId,
        diff: { after: rsvp }
      })
    }

    return rsvp as EventRSVP
  }

  /**
   * Update RSVP status
   */
  static async update(data: z.infer<typeof UpdateRSVPSchema>, userId: string): Promise<EventRSVP> {
    const validated = UpdateRSVPSchema.parse(data)
    const { id, ...updateData } = validated

    const existingRSVP = await prisma.eventRSVP.findUnique({
      where: { id }
    })

    if (!existingRSVP) {
      throw new Error('RSVP not found')
    }

    const rsvp = await prisma.eventRSVP.update({
      where: { id },
      data: updateData
    })

    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'EventRSVP',
      resourceId: rsvp.id,
      actorId: userId,
      diff: { before: existingRSVP, after: rsvp }
    })

    return rsvp as EventRSVP
  }

  /**
   * Get RSVPs for an event
   */
  static async getByEvent(eventId: string, status?: RSVPStatus) {
    const where: any = { eventId }
    if (status) {
      where.status = status
    }

    return prisma.eventRSVP.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    }) as Promise<EventRSVP[]>
  }

  /**
   * Get RSVP by email for an event
   */
  static async getByEventAndEmail(eventId: string, email: string): Promise<EventRSVP | null> {
    return prisma.eventRSVP.findFirst({
      where: { eventId, email }
    }) as Promise<EventRSVP | null>
  }

  /**
   * Get RSVP statistics for an event
   */
  static async getEventRSVPStats(eventId: string) {
    const rsvps = await prisma.eventRSVP.groupBy({
      by: ['status'],
      where: { eventId },
      _count: { status: true }
    })

    const stats = {
      PENDING: 0,
      CONFIRMED: 0,
      DECLINED: 0,
      CANCELLED: 0,
      total: 0
    }

    rsvps.forEach((rsvp: any) => {
      stats[rsvp.status as RSVPStatus] = rsvp._count.status
      stats.total += rsvp._count.status
    })

    return stats
  }
}
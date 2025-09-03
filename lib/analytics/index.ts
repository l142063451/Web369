/**
 * Analytics Service - Umami/Plausible Integration
 * PR15 - Analytics, SEO & Open Data
 * 
 * Provides privacy-friendly analytics with server-side event tracking
 * for key user actions and comprehensive analytics dashboard
 */

import { headers } from 'next/headers'

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, string | number | boolean>
  url?: string
  referrer?: string
  userAgent?: string
  timestamp?: Date
}

export interface AnalyticsConfig {
  websiteId: string
  host: string
  enabled: boolean
  anonymizeIP: boolean
}

class AnalyticsService {
  private config: AnalyticsConfig

  constructor() {
    this.config = {
      websiteId: process.env.UMAMI_WEBSITE_ID || '',
      host: process.env.UMAMI_HOST || '',
      enabled: process.env.NODE_ENV === 'production' && Boolean(process.env.UMAMI_WEBSITE_ID),
      anonymizeIP: true,
    }
  }

  /**
   * Track server-side events for key actions
   */
  async trackEvent(event: AnalyticsEvent): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('Analytics disabled - would track:', event)
      return false
    }

    try {
      const headersList = headers()
      const userAgent = headersList.get('user-agent') || ''
      const ip = this.config.anonymizeIP ? this.anonymizeIP(headersList.get('x-forwarded-for') || '') : undefined

      const payload = {
        website: this.config.websiteId,
        name: event.name,
        data: event.properties || {},
        url: event.url || '/',
        referrer: event.referrer || '',
        hostname: new URL(this.config.host).hostname,
        screen: '1920x1080', // Default for server-side
        language: 'en-US',
        timestamp: event.timestamp?.getTime() || Date.now(),
        ...(ip && { ip }),
      }

      const response = await fetch(`${this.config.host}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
        },
        body: JSON.stringify(payload),
      })

      return response.ok
    } catch (error) {
      console.error('Analytics tracking error:', error)
      return false
    }
  }

  /**
   * Anonymize IP address for privacy
   */
  private anonymizeIP(ip: string): string {
    if (!ip) return ''
    
    if (ip.includes(':')) {
      // IPv6 - zero out last 80 bits (10 bytes)
      const parts = ip.split(':')
      return parts.slice(0, 2).join(':') + '::0:0:0:0'
    } else {
      // IPv4 - zero out last octet
      const parts = ip.split('.')
      return parts.slice(0, 3).join('.') + '.0'
    }
  }

  /**
   * Get client-side analytics script
   */
  getClientScript(): string {
    if (!this.config.enabled) return ''

    return `
      (function() {
        const script = document.createElement('script');
        script.async = true;
        script.src = '${this.config.host}/script.js';
        script.setAttribute('data-website-id', '${this.config.websiteId}');
        script.setAttribute('data-domains', window.location.hostname);
        script.setAttribute('data-auto-track', 'true');
        script.setAttribute('data-do-not-track', 'true');
        document.head.appendChild(script);
      })();
    `
  }

  /**
   * Track key user actions server-side
   */
  async trackPledge(type: 'tree' | 'solar' | 'waste', amount?: number, userId?: string) {
    return this.trackEvent({
      name: 'pledge_created',
      properties: {
        type,
        amount: amount || 1,
        user_id: userId || 'anonymous',
      }
    })
  }

  async trackSubmission(formType: string, status: string, userId?: string) {
    return this.trackEvent({
      name: 'form_submitted',
      properties: {
        form_type: formType,
        status,
        user_id: userId || 'anonymous',
      }
    })
  }

  async trackProjectView(projectId: string, projectType: string) {
    return this.trackEvent({
      name: 'project_viewed',
      properties: {
        project_id: projectId,
        project_type: projectType,
      }
    })
  }

  async trackSchemeCheck(schemeId: string, eligible: boolean, userId?: string) {
    return this.trackEvent({
      name: 'scheme_checked',
      properties: {
        scheme_id: schemeId,
        eligible,
        user_id: userId || 'anonymous',
      }
    })
  }

  async trackDirectoryView(entryType: string, location?: string) {
    return this.trackEvent({
      name: 'directory_viewed',
      properties: {
        entry_type: entryType,
        location: location || 'unknown',
      }
    })
  }

  async trackDownload(dataType: string, format: string) {
    return this.trackEvent({
      name: 'data_downloaded',
      properties: {
        data_type: dataType,
        format,
      }
    })
  }

  async trackNotificationSent(channel: string, audience: string, success: boolean) {
    return this.trackEvent({
      name: 'notification_sent',
      properties: {
        channel,
        audience,
        success,
      }
    })
  }

  /**
   * Get analytics statistics for admin dashboard
   */
  async getStats(startDate?: Date, endDate?: Date) {
    if (!this.config.enabled) {
      // Return mock data for development
      return {
        pageviews: 1234,
        visitors: 456,
        sessions: 789,
        bounceRate: 0.45,
        avgSessionDuration: 180,
        topPages: [
          { path: '/', views: 500 },
          { path: '/projects', views: 200 },
          { path: '/schemes', views: 150 },
        ],
        topEvents: [
          { name: 'pledge_created', count: 45 },
          { name: 'form_submitted', count: 89 },
          { name: 'project_viewed', count: 234 },
        ],
      }
    }

    try {
      const params = new URLSearchParams({
        website: this.config.websiteId,
        ...(startDate && { startAt: startDate.getTime().toString() }),
        ...(endDate && { endAt: endDate.getTime().toString() }),
      })

      const [statsRes, eventsRes] = await Promise.all([
        fetch(`${this.config.host}/api/websites/${this.config.websiteId}/stats?${params}`),
        fetch(`${this.config.host}/api/websites/${this.config.websiteId}/events?${params}`),
      ])

      const [stats, events] = await Promise.all([
        statsRes.json(),
        eventsRes.json(),
      ])

      return {
        pageviews: stats.pageviews?.value || 0,
        visitors: stats.uniques?.value || 0,
        sessions: stats.bounces?.value || 0,
        bounceRate: stats.bounces?.value / stats.pageviews?.value || 0,
        avgSessionDuration: 180, // Not available in basic Umami
        topPages: stats.pages || [],
        topEvents: events || [],
      }
    } catch (error) {
      console.error('Analytics stats error:', error)
      return null
    }
  }
}

export const analytics = new AnalyticsService()
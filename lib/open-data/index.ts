/**
 * Open Data Service - CSV/JSON Downloads and Report Generation
 * PR15 - Analytics, SEO & Open Data
 * 
 * Provides comprehensive open data functionality with CSV/JSON exports,
 * monthly report generation, and public data transparency
 */

import { prisma } from '@/lib/db'

export interface DatasetMetadata {
  name: string
  description: string
  category: string
  format: 'csv' | 'json' | 'pdf'
  updateFrequency: 'daily' | 'weekly' | 'monthly'
  lastUpdated: Date
  recordCount: number
  downloadUrl: string
  license: 'CC0' | 'CC-BY' | 'OGL'
}

export interface OpenDataConfig {
  baseUrl: string
  downloadPath: string
  enabledDatasets: string[]
  licenseText: string
}

class OpenDataService {
  private config: OpenDataConfig

  constructor() {
    this.config = {
      baseUrl: process.env.NEXTAUTH_URL || 'https://ummid-se-hari.com',
      downloadPath: '/api/open-data/download',
      enabledDatasets: [
        'projects',
        'schemes',
        'events',
        'news',
        'directory',
        'analytics-summary',
        'submission-stats',
        'pledge-stats',
      ],
      licenseText: 'Open Government License (OGL) - Free to use for any purpose',
    }
  }

  /**
   * Get available datasets metadata
   */
  async getAvailableDatasets(): Promise<DatasetMetadata[]> {
    const datasets: DatasetMetadata[] = []

    try {
      // Projects dataset
      if (this.config.enabledDatasets.includes('projects')) {
        const projectCount = await prisma.project.count()
        datasets.push({
          name: 'Village Projects',
          description: 'Complete list of village development projects with budgets, status, and progress',
          category: 'Governance',
          format: 'csv',
          updateFrequency: 'weekly',
          lastUpdated: new Date(),
          recordCount: projectCount,
          downloadUrl: `${this.config.downloadPath}/projects.csv`,
          license: 'OGL',
        })
      }

      // Schemes dataset
      if (this.config.enabledDatasets.includes('schemes')) {
        const schemeCount = await prisma.scheme.count()
        datasets.push({
          name: 'Government Schemes',
          description: 'Available government schemes with eligibility criteria and application information',
          category: 'Welfare',
          format: 'json',
          updateFrequency: 'monthly',
          lastUpdated: new Date(),
          recordCount: schemeCount,
          downloadUrl: `${this.config.downloadPath}/schemes.json`,
          license: 'CC-BY',
        })
      }

      // Events dataset
      if (this.config.enabledDatasets.includes('events')) {
        const eventCount = await prisma.event.count()
        datasets.push({
          name: 'Community Events',
          description: 'Upcoming and past community events, meetings, and celebrations',
          category: 'Community',
          format: 'csv',
          updateFrequency: 'daily',
          lastUpdated: new Date(),
          recordCount: eventCount,
          downloadUrl: `${this.config.downloadPath}/events.csv`,
          license: 'CC0',
        })
      }

      // Directory dataset
      if (this.config.enabledDatasets.includes('directory')) {
        const directoryCount = await prisma.directoryEntry.count({ where: { approved: true } })
        datasets.push({
          name: 'Business Directory',
          description: 'Local businesses, SHGs, and service providers directory',
          category: 'Economy',
          format: 'csv',
          updateFrequency: 'weekly',
          lastUpdated: new Date(),
          recordCount: directoryCount,
          downloadUrl: `${this.config.downloadPath}/directory.csv`,
          license: 'OGL',
        })
      }

      // Analytics summary
      if (this.config.enabledDatasets.includes('analytics-summary')) {
        datasets.push({
          name: 'Website Analytics Summary',
          description: 'Monthly summary of website usage, popular pages, and engagement metrics',
          category: 'Transparency',
          format: 'json',
          updateFrequency: 'monthly',
          lastUpdated: new Date(),
          recordCount: 12, // Last 12 months
          downloadUrl: `${this.config.downloadPath}/analytics-summary.json`,
          license: 'CC0',
        })
      }

      return datasets
    } catch (error) {
      console.error('Error getting datasets:', error)
      return []
    }
  }

  /**
   * Export projects data to CSV
   */
  async exportProjects(): Promise<string> {
    try {
      const projects = await prisma.project.findMany({
        include: {
          milestones: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const csvHeader = 'ID,Title,Type,Status,Budget,Spent,Start Date,End Date,Ward,Milestone Count,Last Updated\n'
      const csvRows = projects.map((project: any) => {
        return [
          project.id,
          `"${project.title.replace(/"/g, '""')}"`,
          project.type || 'General',
          project.status,
          project.budget || 0,
          project.spent || 0,
          project.startDate?.toISOString().split('T')[0] || '',
          project.endDate?.toISOString().split('T')[0] || '',
          project.ward || '',
          project.milestones?.length || 0,
          project.updatedAt.toISOString().split('T')[0],
        ].join(',')
      }).join('\n')

      return csvHeader + csvRows
    } catch (error) {
      console.error('Error exporting projects:', error)
      throw new Error('Failed to export projects data')
    }
  }

  /**
   * Export schemes data to JSON
   */
  async exportSchemes(): Promise<object[]> {
    try {
      const schemes = await prisma.scheme.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      })

      return schemes.map((scheme: any) => ({
        id: scheme.id,
        title: scheme.title,
        category: scheme.category,
        description: scheme.description || '',
        eligibilityCriteria: scheme.criteria,
        requiredDocuments: scheme.docsRequired,
        processSteps: scheme.processSteps,
        links: scheme.links,
        createdAt: scheme.createdAt.toISOString(),
        updatedAt: scheme.updatedAt.toISOString(),
      }))
    } catch (error) {
      console.error('Error exporting schemes:', error)
      throw new Error('Failed to export schemes data')
    }
  }

  /**
   * Export events data to CSV
   */
  async exportEvents(): Promise<string> {
    try {
      const events = await prisma.event.findMany({
        orderBy: {
          start: 'desc',
        },
      })

      const csvHeader = 'ID,Title,Start Date,End Date,Location,RSVP Enabled,Description,Created At\n'
      const csvRows = events.map((event: any) => {
        return [
          event.id,
          `"${event.title.replace(/"/g, '""')}"`,
          event.start.toISOString(),
          event.end?.toISOString() || '',
          `"${(event.location || '').replace(/"/g, '""')}"`,
          event.rsvpEnabled ? 'Yes' : 'No',
          `"${(event.description || '').replace(/"/g, '""')}"`,
          event.createdAt.toISOString().split('T')[0],
        ].join(',')
      }).join('\n')

      return csvHeader + csvRows
    } catch (error) {
      console.error('Error exporting events:', error)
      throw new Error('Failed to export events data')
    }
  }

  /**
   * Export directory data to CSV
   */
  async exportDirectory(): Promise<string> {
    try {
      const entries = await prisma.directoryEntry.findMany({
        where: {
          approved: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const csvHeader = 'ID,Name,Type,Contact Phone,Contact Email,Description,Location,Created At\n'
      const csvRows = entries.map((entry: any) => {
        const contact = entry.contact as any || {}
        return [
          entry.id,
          `"${entry.name.replace(/"/g, '""')}"`,
          entry.type,
          contact.phone || '',
          contact.email || '',
          `"${(entry.description || '').replace(/"/g, '""')}"`,
          contact.address || '',
          entry.createdAt.toISOString().split('T')[0],
        ].join(',')
      }).join('\n')

      return csvHeader + csvRows
    } catch (error) {
      console.error('Error exporting directory:', error)
      throw new Error('Failed to export directory data')
    }
  }

  /**
   * Generate analytics summary
   */
  async generateAnalyticsSummary(): Promise<object> {
    try {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      
      // Get submission statistics
      const totalSubmissions = await prisma.submission.count()
      const monthlySubmissions = await prisma.submission.count({
        where: {
          createdAt: {
            gte: lastMonth,
          },
        },
      })

      // Get form statistics
      const activeForms = await prisma.form.count({ where: { active: true } })
      
      // Get project statistics
      const totalProjects = await prisma.project.count()
      const activeProjects = await prisma.project.count({
        where: {
          status: { in: ['ACTIVE', 'IN_PROGRESS'] }
        },
      })

      // Get pledge statistics
      const totalPledges = await prisma.pledge.count({ where: { approved: true } })
      const monthlyPledges = await prisma.pledge.count({
        where: {
          approved: true,
          createdAt: {
            gte: lastMonth,
          },
        },
      })

      return {
        reportDate: now.toISOString(),
        period: {
          from: lastMonth.toISOString(),
          to: now.toISOString(),
        },
        submissions: {
          total: totalSubmissions,
          thisMonth: monthlySubmissions,
        },
        forms: {
          active: activeForms,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
        },
        pledges: {
          total: totalPledges,
          thisMonth: monthlyPledges,
        },
        engagement: {
          // These would come from analytics service in production
          pageviews: 1234,
          visitors: 456,
          avgSessionDuration: 180,
        },
      }
    } catch (error) {
      console.error('Error generating analytics summary:', error)
      throw new Error('Failed to generate analytics summary')
    }
  }

  /**
   * Generate monthly report PDF (stub - would use actual PDF generation)
   */
  async generateMonthlyReport(month: number, year: number): Promise<Buffer> {
    try {
      // In a real implementation, this would use a PDF generation library
      // like Puppeteer, jsPDF, or PDFKit to create a comprehensive report
      
      const reportData = await this.generateAnalyticsSummary()
      const reportText = `
        MONTHLY REPORT - ${month}/${year}
        
        Village Development Summary
        ========================
        
        Projects: ${(reportData as any).projects.total} total, ${(reportData as any).projects.active} active
        Submissions: ${(reportData as any).submissions.total} total, ${(reportData as any).submissions.thisMonth} this month
        Pledges: ${(reportData as any).pledges.total} total, ${(reportData as any).pledges.thisMonth} this month
        
        Engagement Metrics
        ================
        Page Views: ${(reportData as any).engagement.pageviews}
        Unique Visitors: ${(reportData as any).engagement.visitors}
        Average Session: ${(reportData as any).engagement.avgSessionDuration}s
        
        Generated on: ${new Date().toISOString()}
      `

      return Buffer.from(reportText, 'utf8')
    } catch (error) {
      console.error('Error generating monthly report:', error)
      throw new Error('Failed to generate monthly report')
    }
  }

  /**
   * Get data catalog for public display
   */
  async getDataCatalog() {
    const datasets = await this.getAvailableDatasets()
    
    return {
      title: 'Ummid Se Hari - Open Data Catalog',
      description: 'Transparent access to village data promoting accountability and community engagement',
      publisher: 'Damday-Chuanala Gram Panchayat',
      license: this.config.licenseText,
      lastUpdated: new Date().toISOString(),
      totalDatasets: datasets.length,
      datasets,
      downloadStats: {
        totalDownloads: 0, // Would track this in production
        popularDatasets: ['projects', 'schemes', 'events'],
      },
    }
  }

  /**
   * Track download event
   */
  async trackDownload(dataset: string, format: string, ipAddress?: string) {
    // In production, this would:
    // 1. Log the download event
    // 2. Update download statistics
    // 3. Potentially rate limit by IP
    // 4. Send analytics event
    
    console.log(`Download tracked: ${dataset}.${format} from ${ipAddress || 'unknown'}`)
    
    // Import analytics service to track download
    try {
      const { analytics } = await import('@/lib/analytics')
      await analytics.trackDownload(dataset, format)
    } catch (error) {
      console.error('Error tracking download:', error)
    }
  }
}

export const openDataService = new OpenDataService()
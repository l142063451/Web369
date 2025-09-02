/**
 * SLA Monitoring Worker
 * Background job that checks for SLA breaches and triggers escalations
 * Part of PR07: Form Builder & SLA Engine
 * 
 * This worker runs periodically to:
 * 1. Check for SLA breaches
 * 2. Trigger escalation actions
 * 3. Send notifications
 * 4. Update submission statuses
 */

import { createClient } from 'redis'
import { slaEngine } from '@/lib/forms/sla'
import { auditLogger } from '@/lib/auth/audit-logger'

type RedisClient = ReturnType<typeof createClient>

interface JobData {
  type: 'sla_check' | 'escalation_process'
  submissionId?: string
  scheduledAt: string
  retryCount?: number
}

interface WorkerConfig {
  redisUrl: string
  queueName: string
  checkInterval: number // minutes
  maxRetries: number
}

/**
 * SLA Worker Class
 */
export class SlaWorker {
  private redis: RedisClient
  private isRunning = false
  private config: WorkerConfig

  constructor(config?: Partial<WorkerConfig>) {
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      queueName: 'sla_queue',
      checkInterval: 15, // Check every 15 minutes
      maxRetries: 3,
      ...config,
    }

    this.redis = createClient({ url: this.config.redisUrl })
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('SLA Worker is already running')
      return
    }

    this.isRunning = true
    console.log(`Starting SLA Worker with ${this.config.checkInterval}min interval`)

    // Schedule regular SLA checks
    this.scheduleNextSlaCheck()

    // Start processing queue
    this.processQueue()
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    this.isRunning = false
    console.log('Stopping SLA Worker')
    await this.redis.quit()
  }

  /**
   * Schedule the next SLA check
   */
  private scheduleNextSlaCheck(): void {
    if (!this.isRunning) return

    const checkInterval = this.config.checkInterval * 60 * 1000 // Convert to milliseconds
    
    setTimeout(async () => {
      if (this.isRunning) {
        await this.queueSlaCheck()
        this.scheduleNextSlaCheck() // Schedule next check
      }
    }, checkInterval)
  }

  /**
   * Queue an SLA check job
   */
  async queueSlaCheck(): Promise<void> {
    const job: JobData = {
      type: 'sla_check',
      scheduledAt: new Date().toISOString(),
      retryCount: 0,
    }

    await this.redis.lPush(this.config.queueName, JSON.stringify(job))
  }

  /**
   * Queue an escalation processing job
   */
  async queueEscalationProcess(submissionId?: string): Promise<void> {
    const job: JobData = {
      type: 'escalation_process',
      submissionId,
      scheduledAt: new Date().toISOString(),
      retryCount: 0,
    }

    await this.redis.lPush(this.config.queueName, JSON.stringify(job))
  }

  /**
   * Process jobs from the queue
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Blocking pop from queue (wait up to 10 seconds)
        const result = await this.redis.brPop(this.config.queueName, 10)
        
        if (result) {
          const jobData = result.element
          await this.processJob(JSON.parse(jobData))
        }
      } catch (error) {
        console.error('Error processing SLA queue:', error)
        
        // Audit log the error
        await auditLogger.log({
          action: 'sla_worker.error',
          resource: 'System',
          resourceId: 'sla_worker',
          actorId: 'system',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        }).catch(console.error)

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: JobData): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`Processing SLA job: ${job.type}`, job.submissionId || '')

      switch (job.type) {
        case 'sla_check':
          await this.processSlaCheck()
          break
          
        case 'escalation_process':
          await this.processEscalation(job.submissionId)
          break
          
        default:
          console.warn(`Unknown job type: ${job.type}`)
          return
      }

      const duration = Date.now() - startTime
      console.log(`Completed SLA job ${job.type} in ${duration}ms`)

      // Audit log successful job processing
      await auditLogger.log({
        action: 'sla_worker.job_completed',
        resource: 'System',
        resourceId: 'sla_worker',
        actorId: 'system',
        metadata: {
          jobType: job.type,
          submissionId: job.submissionId,
          duration,
          timestamp: new Date().toISOString(),
        },
      })

    } catch (error) {
      console.error(`Error processing SLA job ${job.type}:`, error)
      
      // Retry logic
      if (job.retryCount && job.retryCount < this.config.maxRetries) {
        const retryJob = {
          ...job,
          retryCount: (job.retryCount || 0) + 1,
        }
        
        // Re-queue with delay
        setTimeout(async () => {
          await this.redis.lPush(this.config.queueName, JSON.stringify(retryJob))
        }, 5000 * retryJob.retryCount) // Exponential backoff
        
        console.log(`Retrying SLA job ${job.type}, attempt ${retryJob.retryCount}`)
      } else {
        // Max retries reached, audit log the failure
        await auditLogger.log({
          action: 'sla_worker.job_failed',
          resource: 'System',
          resourceId: 'sla_worker',
          actorId: 'system',
          metadata: {
            jobType: job.type,
            submissionId: job.submissionId,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: job.retryCount || 0,
            timestamp: new Date().toISOString(),
          },
        }).catch(console.error)
      }
    }
  }

  /**
   * Process SLA check job
   */
  private async processSlaCheck(): Promise<void> {
    const actions = await slaEngine.checkSlaBreaches()
    
    if (actions.length > 0) {
      console.log(`Found ${actions.length} SLA breaches requiring action`)
      
      // Queue escalation processing for each action
      for (const action of actions) {
        await this.queueEscalationProcess(action.submissionId)
      }
    } else {
      console.log('No SLA breaches found')
    }
  }

  /**
   * Process escalation job
   */
  private async processEscalation(submissionId?: string): Promise<void> {
    if (submissionId) {
      // Process specific submission escalation
      console.log(`Processing escalation for submission: ${submissionId}`)
      // The actual escalation processing happens in slaEngine.processEscalations()
      // This would be enhanced to process a specific submission
    } else {
      // Process all pending escalations
      console.log('Processing all pending escalations')
      await slaEngine.processEscalations()
    }
  }

  /**
   * Get worker status and metrics
   */
  async getStatus(): Promise<{
    isRunning: boolean
    queueLength: number
    config: WorkerConfig
    uptime: number
  }> {
    const queueLength = await this.redis.lLen(this.config.queueName)
    
    return {
      isRunning: this.isRunning,
      queueLength,
      config: this.config,
      uptime: process.uptime(),
    }
  }

  /**
   * Clear the job queue (useful for maintenance)
   */
  async clearQueue(): Promise<number> {
    const cleared = await this.redis.del(this.config.queueName)
    console.log(`Cleared ${cleared} jobs from SLA queue`)
    return cleared
  }

  /**
   * Add a manual SLA check job (useful for testing)
   */
  async triggerManualSlaCheck(): Promise<void> {
    console.log('Manually triggering SLA check')
    await this.queueSlaCheck()
  }
}

// Export singleton instance
export const slaWorker = new SlaWorker()

// If running as a standalone script
if (require.main === module) {
  console.log('Starting SLA Worker as standalone process')
  
  const worker = new SlaWorker()
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully')
    await worker.stop()
    process.exit(0)
  })
  
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully')
    await worker.stop()
    process.exit(0)
  })
  
  // Start the worker
  worker.start().catch(error => {
    console.error('Failed to start SLA Worker:', error)
    process.exit(1)
  })
}
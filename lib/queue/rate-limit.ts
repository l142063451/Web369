import { createClient, RedisClientType } from 'redis'

let redis: RedisClientType | null = null

/**
 * Get Redis client instance
 */
function getRedisClient(): RedisClientType {
  if (!redis) {
    redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    })
    
    redis.on('error', (err: Error) => {
      console.error('Redis connection error:', err)
    })
    
    redis.on('connect', () => {
      console.log('Redis connected successfully')
    })
  }
  
  return redis
}

export interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Maximum requests in window
  keyGenerator?: (identifier: string) => string  // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalHits: number
}

/**
 * Token bucket rate limiter using Redis
 */
export class RateLimiter {
  private redis: RedisClientType
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.redis = getRedisClient()
    this.config = config
  }

  /**
   * Check if request is allowed and consume a token
   */
  async consume(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : `rate_limit:${identifier}`
    const windowStart = Math.floor(Date.now() / this.config.windowMs) * this.config.windowMs
    const windowKey = `${key}:${windowStart}`
    
    try {
      // Get current count
      const current = await this.redis.get(windowKey)
      const currentCount = current ? parseInt(current) : 0
      
      // Check if limit exceeded
      if (currentCount >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: windowStart + this.config.windowMs,
          totalHits: currentCount,
        }
      }
      
      // Increment counter and set expiry
      const multi = this.redis.multi()
      multi.incr(windowKey)
      multi.expire(windowKey, Math.ceil(this.config.windowMs / 1000))
      await multi.exec()
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - currentCount - 1,
        resetTime: windowStart + this.config.windowMs,
        totalHits: currentCount + 1,
      }
    } catch (error) {
      console.error('Rate limiter error:', error)
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: Date.now() + this.config.windowMs,
        totalHits: 1,
      }
    }
  }

  /**
   * Get current rate limit status without consuming
   */
  async status(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : `rate_limit:${identifier}`
    const windowStart = Math.floor(Date.now() / this.config.windowMs) * this.config.windowMs
    const windowKey = `${key}:${windowStart}`
    
    try {
      const current = await this.redis.get(windowKey)
      const currentCount = current ? parseInt(current) : 0
      
      return {
        allowed: currentCount < this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - currentCount),
        resetTime: windowStart + this.config.windowMs,
        totalHits: currentCount,
      }
    } catch (error) {
      console.error('Rate limiter status error:', error)
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        totalHits: 0,
      }
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(identifier) : `rate_limit:${identifier}`
    const windowStart = Math.floor(Date.now() / this.config.windowMs) * this.config.windowMs
    const windowKey = `${key}:${windowStart}`
    
    try {
      await this.redis.del(windowKey)
    } catch (error) {
      console.error('Rate limiter reset error:', error)
    }
  }
}

// Pre-configured rate limiters for common use cases
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (identifier) => `auth:${identifier}`,
})

export const formLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 form submissions per minute
  keyGenerator: (identifier) => `form:${identifier}`,
})

export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 API requests per minute
  keyGenerator: (identifier) => `api:${identifier}`,
})

export const uploadLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 uploads per minute
  keyGenerator: (identifier) => `upload:${identifier}`,
})

export const notificationLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 notifications per hour
  keyGenerator: (identifier) => `notification:${identifier}`,
})

/**
 * Rate limit middleware helper
 */
export async function checkRateLimit(
  limiter: RateLimiter,
  identifier: string
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const result = await limiter.consume(identifier)
  
  const headers = {
    'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  }
  
  return {
    allowed: result.allowed,
    headers,
  }
}

/**
 * Get client IP address for rate limiting
 */
export function getClientIdentifier(req: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnecting = req.headers.get('cf-connecting-ip')
  
  // Use the first IP if forwarded header contains multiple IPs
  const clientIp = forwarded?.split(',')[0].trim() || realIp || cfConnecting || 'unknown'
  
  return clientIp
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
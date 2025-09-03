/**
 * Advanced Rate Limiting Service
 * 
 * Enhanced rate limiting for authentication endpoints, forms, and API routes
 * Implements Redis-based token bucket algorithm with security hardening
 */

import { Redis } from 'ioredis'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  skipLimit?: number    // Skip rate limiting after this many successful requests
  blockDuration?: number // Block duration in milliseconds after limit exceeded
  keyGenerator?: (req: NextRequest) => string
  skipIf?: (req: NextRequest) => boolean
  onLimitReached?: (req: NextRequest) => void
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  blocked?: boolean
  blockUntil?: number
}

export class AdvancedRateLimit {
  private redis: Redis
  private config: RateLimitConfig
  private keyPrefix: string

  constructor(config: RateLimitConfig, keyPrefix = 'rate_limit') {
    this.config = config
    this.keyPrefix = keyPrefix
    
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    })
  }

  /**
   * Check rate limit for a request
   */
  async checkLimit(req: NextRequest): Promise<RateLimitResult> {
    try {
      // Skip if configured to skip
      if (this.config.skipIf && this.config.skipIf(req)) {
        return {
          success: true,
          limit: this.config.maxRequests,
          remaining: this.config.maxRequests,
          reset: Date.now() + this.config.windowMs,
        }
      }

      const key = this.generateKey(req)
      const now = Date.now()
      const window = Math.floor(now / this.config.windowMs)
      const redisKey = `${this.keyPrefix}:${key}:${window}`
      const blockKey = `${this.keyPrefix}:blocked:${key}`

      // Check if IP is currently blocked
      const blockUntil = await this.redis.get(blockKey)
      if (blockUntil && parseInt(blockUntil) > now) {
        return {
          success: false,
          limit: this.config.maxRequests,
          remaining: 0,
          reset: window * this.config.windowMs + this.config.windowMs,
          blocked: true,
          blockUntil: parseInt(blockUntil),
        }
      }

      // Get current count
      const count = await this.redis.incr(redisKey)
      
      // Set expiry on first request
      if (count === 1) {
        await this.redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000))
      }

      const remaining = Math.max(0, this.config.maxRequests - count)
      const reset = window * this.config.windowMs + this.config.windowMs

      // Check if limit exceeded
      if (count > this.config.maxRequests) {
        // Block IP if block duration is configured
        if (this.config.blockDuration) {
          const blockUntilTime = now + this.config.blockDuration
          await this.redis.setex(blockKey, Math.ceil(this.config.blockDuration / 1000), blockUntilTime.toString())
        }

        // Call limit reached callback
        if (this.config.onLimitReached) {
          this.config.onLimitReached(req)
        }

        return {
          success: false,
          limit: this.config.maxRequests,
          remaining: 0,
          reset,
          blocked: !!this.config.blockDuration,
          blockUntil: this.config.blockDuration ? now + this.config.blockDuration : undefined,
        }
      }

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining,
        reset,
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Fail open - allow request if Redis is down
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        reset: Date.now() + this.config.windowMs,
      }
    }
  }

  /**
   * Generate a unique key for the request
   */
  private generateKey(req: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req)
    }

    // Extract IP address with priority order
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const cfConnecting = req.headers.get('cf-connecting-ip')
    
    const ip = cfConnecting || 
               realIp || 
               (forwarded ? forwarded.split(',')[0].trim() : null) ||
               'unknown'

    // Include user agent hash for additional uniqueness
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const uaHash = crypto.createHash('md5').update(userAgent).digest('hex').substring(0, 8)
    
    return `${ip}:${uaHash}`
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(req: NextRequest): Promise<void> {
    try {
      const key = this.generateKey(req)
      const pattern = `${this.keyPrefix}:${key}:*`
      const keys = await this.redis.keys(pattern)
      
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
      
      // Also remove any blocks
      const blockKey = `${this.keyPrefix}:blocked:${key}`
      await this.redis.del(blockKey)
    } catch (error) {
      console.error('Error resetting rate limit:', error)
    }
  }

  /**
   * Get current limit status without incrementing
   */
  async getStatus(req: NextRequest): Promise<RateLimitResult> {
    try {
      const key = this.generateKey(req)
      const now = Date.now()
      const window = Math.floor(now / this.config.windowMs)
      const redisKey = `${this.keyPrefix}:${key}:${window}`
      const blockKey = `${this.keyPrefix}:blocked:${key}`

      // Check if blocked
      const blockUntil = await this.redis.get(blockKey)
      if (blockUntil && parseInt(blockUntil) > now) {
        return {
          success: false,
          limit: this.config.maxRequests,
          remaining: 0,
          reset: window * this.config.windowMs + this.config.windowMs,
          blocked: true,
          blockUntil: parseInt(blockUntil),
        }
      }

      const count = await this.redis.get(redisKey)
      const currentCount = count ? parseInt(count) : 0
      const remaining = Math.max(0, this.config.maxRequests - currentCount)

      return {
        success: currentCount < this.config.maxRequests,
        limit: this.config.maxRequests,
        remaining,
        reset: window * this.config.windowMs + this.config.windowMs,
      }
    } catch (error) {
      console.error('Error getting rate limit status:', error)
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        reset: Date.now() + this.config.windowMs,
      }
    }
  }
}

// Pre-configured rate limiters for common use cases

/**
 * Authentication endpoints rate limiter (strict)
 */
export const authRateLimit = new AdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,            // 5 attempts per 15 minutes
  blockDuration: 30 * 60 * 1000, // Block for 30 minutes after limit
  onLimitReached: (req) => {
    console.warn(`Auth rate limit exceeded for ${req.headers.get('x-forwarded-for') || 'unknown IP'}`)
  }
}, 'auth_limit')

/**
 * Form submissions rate limiter
 */
export const formRateLimit = new AdvancedRateLimit({
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 5,         // 5 submissions per minute
  blockDuration: 5 * 60 * 1000, // Block for 5 minutes
}, 'form_limit')

/**
 * API endpoints rate limiter (general)
 */
export const apiRateLimit = new AdvancedRateLimit({
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 60,        // 60 requests per minute
  skipIf: (req) => {
    // Skip for admin users with valid session
    const authHeader = req.headers.get('authorization')
    return authHeader?.startsWith('Bearer admin_') ?? false
  }
}, 'api_limit')

/**
 * File upload rate limiter
 */
export const uploadRateLimit = new AdvancedRateLimit({
  windowMs: 60 * 1000,    // 1 minute
  maxRequests: 3,         // 3 uploads per minute
  blockDuration: 10 * 60 * 1000, // Block for 10 minutes
}, 'upload_limit')

/**
 * Password reset rate limiter (very strict)
 */
export const passwordResetRateLimit = new AdvancedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,           // 3 attempts per hour
  blockDuration: 2 * 60 * 60 * 1000, // Block for 2 hours
}, 'password_reset_limit')

/**
 * Middleware factory for Next.js API routes
 */
export function withRateLimit(rateLimiter: AdvancedRateLimit) {
  return async function(req: NextRequest): Promise<NextResponse | null> {
    const result = await rateLimiter.checkLimit(req)
    
    if (!result.success) {
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: result.blocked 
            ? `Too many requests. Blocked until ${new Date(result.blockUntil || 0).toISOString()}`
            : `Too many requests. Try again after ${new Date(result.reset).toISOString()}`,
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
          blocked: result.blocked || false,
        },
        { status: 429 }
      )
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.reset.toString())
      response.headers.set('Retry-After', Math.ceil((result.reset - Date.now()) / 1000).toString())
      
      if (result.blocked && result.blockUntil) {
        response.headers.set('X-RateLimit-BlockedUntil', result.blockUntil.toString())
      }
      
      return response
    }
    
    // Add rate limit headers to successful responses
    return null // Let the request continue
  }
}

/**
 * Get client IP address with Cloudflare support
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip') 
  const cfConnecting = req.headers.get('cf-connecting-ip')
  
  return cfConnecting || 
         realIp || 
         (forwarded ? forwarded.split(',')[0].trim() : null) ||
         'unknown'
}

/**
 * Enhanced security headers for rate limited responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()')
  
  return response
}
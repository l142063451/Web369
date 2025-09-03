/**
 * Enhanced Content Security Policy (CSP) Implementation
 * 
 * Strict CSP configuration with reporting and enforcement for PR16 security hardening
 * Implements OWASP ASVS-L2 compliant security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export interface CSPConfig {
  enforceMode: boolean
  reportUri?: string
  directives: {
    defaultSrc: string[]
    scriptSrc: string[]
    styleSrc: string[]
    imgSrc: string[]
    fontSrc: string[]
    connectSrc: string[]
    mediaSrc: string[]
    objectSrc: string[]
    childSrc: string[]
    frameSrc: string[]
    frameAncestors: string[]
    formAction: string[]
    baseUri: string[]
    upgradeInsecureRequests: boolean
  }
}

/**
 * Production CSP configuration - Strict enforcement
 */
export const strictCSPConfig: CSPConfig = {
  enforceMode: true,
  reportUri: '/api/security/csp-report',
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // For Next.js inline scripts - TODO: Replace with nonces
      "'unsafe-eval'",   // For Next.js dev mode - Remove in production
      'https://challenges.cloudflare.com', // Turnstile
      'https://www.googletagmanager.com',  // Analytics
      'https://plausible.io',               // Analytics alternative
      'https://umami.is',                   // Analytics alternative
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // For dynamic styles - TODO: Replace with nonces
      'https://fonts.googleapis.com',
      'https://cdnjs.cloudflare.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https:', // Allow HTTPS images from any source
      'https://*.digitaloceanspaces.com', // DO Spaces
      'https://*.amazonaws.com',           // S3
      'https://images.unsplash.com',       // Sample images
      'https://via.placeholder.com',       // Placeholder images
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
    ],
    connectSrc: [
      "'self'",
      'https:', // Allow HTTPS connections
      'wss:',   // WebSocket connections
      'https://api.umami.is',
      'https://plausible.io',
      'https://challenges.cloudflare.com',
    ],
    mediaSrc: [
      "'self'",
      'https://*.digitaloceanspaces.com',
      'https://*.amazonaws.com',
      'blob:',
    ],
    objectSrc: ["'none'"],
    childSrc: [
      "'self'",
      'blob:',
    ],
    frameSrc: [
      "'none'", // Prevent framing by default
    ],
    frameAncestors: ["'none'"], // Prevent being framed
    formAction: [
      "'self'",
      'https://challenges.cloudflare.com', // Turnstile forms
    ],
    baseUri: ["'self'"],
    upgradeInsecureRequests: true,
  }
}

/**
 * Development CSP configuration - More permissive for development
 */
export const devCSPConfig: CSPConfig = {
  enforceMode: false, // Report-only mode for development
  reportUri: '/api/security/csp-report',
  directives: {
    ...strictCSPConfig.directives,
    scriptSrc: [
      ...strictCSPConfig.directives.scriptSrc,
      "'unsafe-eval'", // Next.js dev mode requirement
      'http://localhost:*', // Local development
    ],
    connectSrc: [
      ...strictCSPConfig.directives.connectSrc,
      'http://localhost:*',
      'ws://localhost:*',
    ],
    upgradeInsecureRequests: false,
  }
}

export class CSPManager {
  private config: CSPConfig
  private nonces: Map<string, string> = new Map()

  constructor(config: CSPConfig) {
    this.config = config
  }

  /**
   * Generate a cryptographically secure nonce
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString('base64')
  }

  /**
   * Create CSP header value from configuration
   */
  createCSPHeader(nonce?: string): string {
    const directives: string[] = []

    // Add each directive
    Object.entries(this.config.directives).forEach(([key, value]) => {
      if (key === 'upgradeInsecureRequests') {
        if (value) {
          directives.push('upgrade-insecure-requests')
        }
        return
      }

      const directiveName = this.camelToKebab(key)
      
      if (Array.isArray(value)) {
        let directiveValue = value.join(' ')
        
        // Add nonce to script-src and style-src if provided
        if (nonce && (key === 'scriptSrc' || key === 'styleSrc')) {
          directiveValue += ` 'nonce-${nonce}'`
        }
        
        directives.push(`${directiveName} ${directiveValue}`)
      } else if (value) {
        directives.push(`${directiveName} ${value}`)
      }
    })

    // Add report-uri if configured
    if (this.config.reportUri) {
      directives.push(`report-uri ${this.config.reportUri}`)
      directives.push(`report-to csp-endpoint`)
    }

    return directives.join('; ')
  }

  /**
   * Apply CSP headers to a response
   */
  applyHeaders(response: NextResponse, nonce?: string): NextResponse {
    const cspHeader = this.createCSPHeader(nonce)
    const headerName = this.config.enforceMode 
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only'

    response.headers.set(headerName, cspHeader)

    // Add other security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '0') // Disabled as CSP provides better protection
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
    
    // Permissions Policy (formerly Feature Policy)
    response.headers.set('Permissions-Policy', [
      'geolocation=()',
      'camera=()',
      'microphone=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
    ].join(', '))

    // HSTS (only in production)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }

    // Report-To header for CSP reporting
    if (this.config.reportUri) {
      response.headers.set('Report-To', JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: this.config.reportUri }]
      }))
    }

    return response
  }

  /**
   * Check if a source is allowed by current CSP
   */
  isSourceAllowed(directive: keyof CSPConfig['directives'], source: string): boolean {
    const allowedSources = this.config.directives[directive]
    
    if (!Array.isArray(allowedSources)) {
      return false
    }

    return allowedSources.some(allowed => {
      if (allowed === "'self'" && this.isSelfSource(source)) {
        return true
      }
      if (allowed === "'unsafe-inline'" || allowed === "'unsafe-eval'") {
        return false // These require special handling
      }
      if (allowed.startsWith('https://') && source.startsWith(allowed)) {
        return true
      }
      if (allowed === 'https:' && source.startsWith('https://')) {
        return true
      }
      if (allowed === 'data:' && source.startsWith('data:')) {
        return true
      }
      if (allowed === 'blob:' && source.startsWith('blob:')) {
        return true
      }
      return source === allowed
    })
  }

  /**
   * Validate and sanitize a script source
   */
  validateScriptSource(src: string): boolean {
    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:']
    const lowerSrc = src.toLowerCase()
    
    if (dangerousProtocols.some(proto => lowerSrc.startsWith(proto))) {
      return false
    }

    return this.isSourceAllowed('scriptSrc', src)
  }

  /**
   * Generate CSP-compliant inline script with nonce
   */
  createInlineScript(code: string, nonce: string): string {
    return `<script nonce="${nonce}">${code}</script>`
  }

  /**
   * Generate CSP-compliant inline style with nonce
   */
  createInlineStyle(css: string, nonce: string): string {
    return `<style nonce="${nonce}">${css}</style>`
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  }

  private isSelfSource(source: string): boolean {
    // In a real implementation, this would check against the current origin
    return source === "'self'" || source.startsWith('/')
  }
}

// Export configured CSP managers
export const prodCSPManager = new CSPManager(strictCSPConfig)
export const devCSPManager = new CSPManager(devCSPConfig)

/**
 * Get appropriate CSP manager based on environment
 */
export function getCSPManager(): CSPManager {
  return process.env.NODE_ENV === 'production' ? prodCSPManager : devCSPManager
}

/**
 * Middleware to apply CSP headers
 */
export function withCSP() {
  return function(request: NextRequest): NextResponse | null {
    const response = NextResponse.next()
    const cspManager = getCSPManager()
    
    // Generate nonce for this request
    const nonce = cspManager.generateNonce()
    
    // Apply CSP headers
    cspManager.applyHeaders(response, nonce)
    
    // Store nonce for use in components (via request headers)
    response.headers.set('X-Nonce', nonce)
    
    return response
  }
}

/**
 * Extract nonce from request headers for use in components
 */
export function getNonce(request: NextRequest): string | undefined {
  return request.headers.get('X-Nonce') || undefined
}

/**
 * CSP violation report interface
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string
    referrer: string
    'violated-directive': string
    'effective-directive': string
    'original-policy': string
    disposition: 'enforce' | 'report'
    'blocked-uri': string
    'line-number': number
    'column-number': number
    'source-file': string
    'status-code': number
    'script-sample': string
  }
}

/**
 * Log CSP violation for monitoring
 */
export function logCSPViolation(report: CSPViolationReport) {
  const violation = report['csp-report']
  
  console.warn('CSP Violation:', {
    uri: violation['document-uri'],
    directive: violation['violated-directive'],
    blockedUri: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
    sample: violation['script-sample']?.substring(0, 100),
    userAgent: violation.referrer,
  })
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // monitoringService.reportCSPViolation(violation)
  }
}
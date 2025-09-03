/**
 * CSP Violation Reporting Endpoint
 * 
 * Handles Content Security Policy violation reports for security monitoring
 * Part of PR16 security hardening implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { logCSPViolation, type CSPViolationReport } from '@/lib/security/csp-enhanced'
import { withRateLimit, apiRateLimit } from '@/lib/security/rate-limit-enhanced'

// Rate limit CSP reports to prevent abuse
const cspReportRateLimit = withRateLimit(apiRateLimit)

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await cspReportRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Parse the CSP violation report
    const reportData = await request.json() as CSPViolationReport

    // Validate report structure
    if (!reportData['csp-report']) {
      return NextResponse.json(
        { error: 'Invalid CSP report format' },
        { status: 400 }
      )
    }

    const violation = reportData['csp-report']

    // Log the violation
    logCSPViolation(reportData)

    // Store violation for analysis (in production, store in database)
    await storeCSPViolation({
      documentUri: violation['document-uri'],
      referrer: violation.referrer,
      violatedDirective: violation['violated-directive'],
      effectiveDirective: violation['effective-directive'],
      originalPolicy: violation['original-policy'],
      disposition: violation.disposition,
      blockedUri: violation['blocked-uri'],
      lineNumber: violation['line-number'],
      columnNumber: violation['column-number'],
      sourceFile: violation['source-file'],
      statusCode: violation['status-code'],
      scriptSample: violation['script-sample'],
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || '',
      clientIP: getClientIP(request),
    })

    // Check if this is a critical violation that needs immediate attention
    if (isCriticalViolation(violation)) {
      await alertSecurityTeam(violation)
    }

    return NextResponse.json({ status: 'received' }, { status: 200 })

  } catch (error) {
    console.error('Error processing CSP report:', error)
    return NextResponse.json(
      { error: 'Failed to process report' },
      { status: 500 }
    )
  }
}

interface StoredCSPViolation {
  documentUri: string
  referrer: string
  violatedDirective: string
  effectiveDirective: string
  originalPolicy: string
  disposition: 'enforce' | 'report'
  blockedUri: string
  lineNumber: number
  columnNumber: number
  sourceFile: string
  statusCode: number
  scriptSample: string
  timestamp: string
  userAgent: string
  clientIP: string
}

/**
 * Store CSP violation for analysis
 */
async function storeCSPViolation(violation: StoredCSPViolation) {
  try {
    // In production, store in database
    // For now, log to file or monitoring service
    
    console.log('CSP Violation Stored:', {
      id: generateViolationId(),
      ...violation
    })

    // Example: Store in Redis for temporary analysis
    // await redis.lpush('csp_violations', JSON.stringify(violation))
    // await redis.ltrim('csp_violations', 0, 999) // Keep last 1000 violations

  } catch (error) {
    console.error('Failed to store CSP violation:', error)
  }
}

/**
 * Check if violation is critical and needs immediate attention
 */
function isCriticalViolation(violation: CSPViolationReport['csp-report']): boolean {
  const criticalPatterns = [
    'script-src',           // Script injection attempts
    'object-src',           // Plugin-related violations
    'frame-ancestors',      // Clickjacking attempts
    'form-action',          // Form submission to external domains
  ]

  const suspiciousUris = [
    'javascript:',          // JavaScript protocol
    'data:text/html',       // Data URI with HTML
    'blob:',                // Blob URLs (potential XSS)
  ]

  const directive = violation['violated-directive']
  const blockedUri = violation['blocked-uri']

  // Check for critical directives
  if (criticalPatterns.some(pattern => directive.includes(pattern))) {
    return true
  }

  // Check for suspicious URIs
  if (suspiciousUris.some(pattern => blockedUri.startsWith(pattern))) {
    return true
  }

  // Check for inline script/style violations (potential XSS)
  if (directive.includes('script-src') && blockedUri === 'inline') {
    return true
  }

  return false
}

/**
 * Alert security team of critical violations
 */
async function alertSecurityTeam(violation: CSPViolationReport['csp-report']) {
  try {
    // In production, send alert via email, Slack, etc.
    console.error('🚨 CRITICAL CSP VIOLATION DETECTED:', {
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      timestamp: new Date().toISOString(),
    })

    // Example: Send to monitoring service
    // await monitoringService.sendAlert({
    //   type: 'csp_violation',
    //   severity: 'critical',
    //   details: violation
    // })

  } catch (error) {
    console.error('Failed to send security alert:', error)
  }
}

/**
 * Generate unique violation ID for tracking
 */
function generateViolationId(): string {
  return `csp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')
  
  return cfConnecting || 
         realIp || 
         (forwarded ? forwarded.split(',')[0].trim() : null) ||
         'unknown'
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
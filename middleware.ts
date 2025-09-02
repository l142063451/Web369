import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { canAccessAdmin, requiresTwoFA } from '@/lib/rbac/permissions'
import { checkRateLimit, authLimiter, apiLimiter, getClientIdentifier } from '@/lib/queue/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Apply rate limiting to all requests
  await applyRateLimit(request)
  
  // Handle admin routes
  if (pathname.startsWith('/admin')) {
    return await handleAdminRoutes(request)
  }
  
  // Handle API routes
  if (pathname.startsWith('/api')) {
    return await handleApiRoutes(request)
  }
  
  // Handle auth routes
  if (pathname.startsWith('/auth')) {
    return await handleAuthRoutes(request)
  }
  
  return NextResponse.next()
}

/**
 * Apply rate limiting to requests
 */
async function applyRateLimit(request: NextRequest): Promise<NextResponse | void> {
  const clientId = getClientIdentifier(request)
  const { pathname } = request.nextUrl
  
  // Choose appropriate rate limiter based on route
  let limiter = apiLimiter // default
  
  if (pathname.startsWith('/auth')) {
    limiter = authLimiter
  } else if (pathname.includes('/upload')) {
    const { uploadLimiter } = await import('@/lib/queue/rate-limit')
    limiter = uploadLimiter
  }
  
  const { allowed, headers } = await checkRateLimit(limiter, clientId)
  
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }
    )
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.next()
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Handle admin routes protection
 */
async function handleAdminRoutes(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })
    
    if (!token?.sub) {
      return redirectToSignIn(request)
    }
    
    // Check if user can access admin panel
    const canAccess = await canAccessAdmin(token.sub)
    if (!canAccess) {
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to access the admin panel.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Check if 2FA is required
    const needs2FA = await requiresTwoFA(token.sub)
    const has2FA = token.twoFAEnabled || false
    
    if (needs2FA && !has2FA) {
      // Redirect to 2FA setup/verification
      const url = request.nextUrl.clone()
      url.pathname = '/auth/2fa'
      url.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Add security headers for admin routes
    const response = NextResponse.next()
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    return response
  } catch (error) {
    console.error('Admin route middleware error:', error)
    return redirectToSignIn(request)
  }
}

/**
 * Handle API routes protection
 */
async function handleApiRoutes(request: NextRequest): Promise<NextResponse | void> {
  const { pathname } = request.nextUrl
  
  // Public API routes that don't need authentication
  const publicRoutes = [
    '/api/auth',
    '/api/health',
    '/api/public',
  ]
  
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Protected API routes
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })
    
    if (!token?.sub) {
      return new NextResponse(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Add user info to request headers for downstream processing
    const response = NextResponse.next()
    response.headers.set('X-User-ID', token.sub)
    response.headers.set('X-User-Roles', JSON.stringify(token.roles || []))
    
    return response
  } catch (error) {
    console.error('API route middleware error:', error)
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Authentication check failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Handle auth routes
 */
async function handleAuthRoutes(request: NextRequest): Promise<NextResponse | void> {
  // Apply stricter rate limiting to auth routes
  const clientId = getClientIdentifier(request)
  const { allowed } = await checkRateLimit(authLimiter, clientId)
  
  if (!allowed) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/rate-limited'
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

/**
 * Redirect to sign-in page
 */
function redirectToSignIn(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = '/auth/signin'
  url.searchParams.set('callbackUrl', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

/**
 * Check CSRF token for state-changing operations
 */
async function checkCSRFToken(request: NextRequest): Promise<boolean> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true // CSRF not needed for safe methods
  }
  
  const csrfToken = request.headers.get('X-CSRF-Token')
  const sessionCsrf = request.cookies.get('csrf-token')?.value
  
  return csrfToken === sessionCsrf
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|robots.txt|sitemap.xml).*)',
  ],
}
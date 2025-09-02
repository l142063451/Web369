import { AuthOptions, Session } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { prisma } from '@/lib/db'
import { sendVerificationRequest } from './email'
import { getUserRoles } from '@/lib/rbac/permissions'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.SMTP_FROM,
      sendVerificationRequest,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }): Promise<Session> {
      if (session?.user) {
        // Add user ID and roles to session
        session.user.id = user.id
        
        // Fetch user roles
        const userRoles = await getUserRoles(user.id)
        session.user.roles = userRoles
        
        // Check 2FA status
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { twoFAEnabled: true }
        })
        
        session.user.twoFAEnabled = dbUser?.twoFAEnabled ?? false
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Allow OAuth sign-ins
      if (account?.provider === 'google') {
        return true
      }
      
      // Allow email sign-ins
      if (account?.provider === 'email') {
        return true
      }
      
      return false
    },
  },
  session: {
    strategy: 'database',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60, // 24 hours
      },
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Log successful sign-ins for audit
      console.log(`User signed in: ${user.email} via ${account?.provider}`)
      
      // If new user, assign default roles
      if (isNewUser) {
        await assignDefaultRoles(user.id)
      }
    },
  },
}

async function assignDefaultRoles(userId: string) {
  // Assign default 'citizen' role to new users
  try {
    const citizenRole = await prisma.role.findFirst({
      where: { name: 'citizen' }
    })
    
    if (citizenRole) {
      await prisma.userRole.create({
        data: {
          userId,
          roleId: citizenRole.id,
        },
      })
    }
  } catch (error) {
    console.error('Failed to assign default role:', error)
  }
}

// Extend the next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      roles: string[]
      twoFAEnabled: boolean
    }
  }
  
  interface User {
    id: string
    roles?: string[]
    twoFAEnabled?: boolean
  }
}
import { PrismaClient } from '@prisma/client'

// Check if we're in a development environment without Prisma binaries
export const canUsePrisma = () => {
  try {
    // Try to create a PrismaClient instance
    new PrismaClient()
    return true
  } catch (error) {
    console.warn('Prisma client not available, falling back to mock:', (error as Error).message)
    return false
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaInstance: PrismaClient

if (canUsePrisma()) {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance
} else {
  // Use mock for development when Prisma binaries aren't available
  const { prisma: mockPrisma } = require('./db-mock')
  prismaInstance = mockPrisma
}

export const prisma = prismaInstance
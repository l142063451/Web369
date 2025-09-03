/**
 * Mock Prisma client for development when binaries.prisma.sh is not accessible
 * This allows builds and development to proceed without database connectivity
 */

// Mock Prisma client that provides typing but no-op operations
export const prisma = new Proxy({} as any, {
  get() {
    return new Proxy(() => {}, {
      get() {
        return new Proxy(() => Promise.resolve({}), {
          apply() {
            return Promise.resolve({})
          },
          get() {
            return () => Promise.resolve({})
          }
        })
      },
      apply() {
        return Promise.resolve({})
      }
    })
  }
})

export default prisma
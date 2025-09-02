import createNextIntlPlugin from 'next-intl/plugin'
import { createSecureHeaders } from './scripts/csp.js'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  images: { 
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  experimental: { 
    turbo: { rules: {} }
  },
  async headers() {
    const common = createSecureHeaders()
    return [
      { source: '/(.*)', headers: common },
      { source: '/admin(.*)', headers: [...common, { key: 'X-Frame-Options', value: 'DENY' }] }
    ]
  }
}

export default withNextIntl(nextConfig)
import { generateSW } from 'workbox-build'

await generateSW({
  globDirectory: '.next/static',
  globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2,json}'],
  swDest: 'public/sw.js',
  navigateFallback: '/offline',
  navigateFallbackDenylist: [/^\/_/, /\/api\//],
  runtimeCaching: [
    // API routes with background sync for forms
    { 
      urlPattern: ({url}) => url.pathname.startsWith('/api/forms/'), 
      handler: 'NetworkOnly', 
      options: { 
        backgroundSync: { 
          name: 'formsQueue', 
          options: { 
            maxRetentionTime: 24 * 60 * 60 // 24 hours in seconds
          } 
        } 
      } 
    },
    // Other API routes with network first strategy
    { 
      urlPattern: ({url}) => url.pathname.startsWith('/api/'), 
      handler: 'NetworkFirst', 
      options: { 
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 // 1 hour
        },
        networkTimeoutSeconds: 3
      } 
    },
    // Images with cache first strategy
    { 
      urlPattern: ({request}) => request.destination === 'image', 
      handler: 'CacheFirst', 
      options: { 
        cacheName: 'images-cache', 
        expiration: { 
          maxEntries: 200, 
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        } 
      } 
    },
    // Map tiles caching
    {
      urlPattern: ({url}) => /\/tiles\//.test(url.href) || url.hostname.includes('openstreetmap') || url.hostname.includes('maptiler'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'map-tiles',
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
        }
      }
    },
    // Pages with network first strategy
    {
      urlPattern: ({request}) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 // 24 hours
        },
        networkTimeoutSeconds: 3
      }
    },
    // Static assets
    {
      urlPattern: ({request}) => request.destination === 'script' || request.destination === 'style',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
        }
      }
    }
  ],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // Additional options for PWA functionality
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
})
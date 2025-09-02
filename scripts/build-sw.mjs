import { generateSW } from 'workbox-build'

await generateSW({
  globDirectory: 'public',
  globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}', 'manifest.webmanifest'],
  swDest: 'public/sw.js',
  runtimeCaching: [
    { 
      urlPattern: ({url}) => url.pathname.startsWith('/api/'), 
      handler: 'NetworkFirst', 
      options: { 
        cacheName: 'api', 
        backgroundSync: { 
          name: 'apiQueue', 
          options: { maxRetentionTime: 24 * 60 } 
        } 
      } 
    },
    { 
      urlPattern: ({request}) => request.destination === 'image', 
      handler: 'CacheFirst', 
      options: { 
        cacheName: 'images', 
        expiration: { 
          maxEntries: 200, 
          maxAgeSeconds: 60 * 60 * 24 * 30 
        } 
      } 
    },
    {
      urlPattern: ({url}) => url.pathname.startsWith('/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24
        }
      }
    }
  ],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true
})
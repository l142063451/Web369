import './globals.css'
import { PWARegister } from '@/components/pwa/PWARegister'

export const metadata = {
  title: 'Ummid Se Hari - Smart Village PWA',
  description: 'Smart, green & transparent village PWA for Damday–Chuanala',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#16A34A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#16A34A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ummid Se Hari" />
        {/* PWA iOS icons */}
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.svg" />
      </head>
      <body className="font-sans antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
import './globals.css'

export const metadata = {
  title: 'Ummid Se Hari - Smart Village PWA',
  description: 'Smart, green & transparent village PWA for Damday–Chuanala',
  manifest: '/manifest.webmanifest',
  themeColor: '#16A34A',
  viewport: 'width=device-width, initial-scale=1',
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
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
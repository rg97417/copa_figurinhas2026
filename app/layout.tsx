import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Barlow } from 'next/font/google'
import './globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const barlow = Barlow({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Figurinha da Copa 2026 — Transforme seu filho em um Craque!',
  description:
    'Crie a figurinha personalizada do seu filho no estilo oficial da Copa do Mundo 2026. Arquivo digital pra imprimir. +25.000 figurinhas criadas!',
  keywords: 'figurinha copa 2026, figurinha personalizada, panini copa do mundo, figurinha filho',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Figurinha da Copa 2026 — Transforme seu filho em um Craque!',
    description: 'Crie a figurinha personalizada do seu filho no estilo Panini Copa 2026! +25.000 famílias já criaram. ⚽🏆',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Figurinha da Copa 2026',
    description: 'Transforme seu filho em um craque da Copa!',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Figurinha Copa 2026',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,   // prevents zoom on input focus on iOS
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFD500' },
    { media: '(prefers-color-scheme: dark)',  color: '#0D1B4B' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${barlow.variable}`}>
      <head>
        {/* PWA - iOS */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Figurinha Copa 2026" />
        {/* Favicon emoji fallback */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚽</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import SharedNavbar from '../components/navigation/shared-navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Classync',
  description: 'Virtual Classroom Platform',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <SharedNavbar />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  )
}

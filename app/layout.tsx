import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import SharedNavbar from '../components/navigation/shared-navbar'
import AIBubble from '../components/ai-bubble/AIBubble'
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
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <SharedNavbar />
        <main>{children}</main>
        <AIBubble />
        <Analytics />
      </body>
    </html>
  )
}

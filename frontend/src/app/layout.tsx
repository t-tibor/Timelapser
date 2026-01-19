import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Timelapser',
  description: 'RTSP Camera Connection and Video Preview',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
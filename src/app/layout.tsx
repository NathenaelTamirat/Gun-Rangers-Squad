import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Recoil Duel',
  description: 'A physics simulation battle between two autonomous guns',
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

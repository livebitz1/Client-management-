import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClientFlow — Client Management Dashboard',
  description: 'Manage clients, projects, phases and payments',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}

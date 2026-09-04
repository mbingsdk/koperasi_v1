import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Koperasi Ledger',
  description: 'Buku kas digital untuk pengelolaan koperasi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}

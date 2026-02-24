import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'CRM Pro',
  description: 'CRM SaaS — Gestion des contacts, leads et pipeline de vente',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
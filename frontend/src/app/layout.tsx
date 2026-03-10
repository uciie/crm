import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../components/auth/AuthProvider'

export const metadata: Metadata = {
  title:       'CRM Pro',
  description: 'CRM SaaS — Gestion des contacts, leads et pipeline de vente',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {/*
          AuthProvider = 1 seul onAuthStateChange pour toute l'app.
          Tous les useAuth() lisent le store Zustand sans créer de listener.
        */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
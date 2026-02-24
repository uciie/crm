'use client'

import { AuthGuard, RoleNavigation } from '@/components/auth/AuthGuard'
import { Header }                    from '@/components/layout/Header'

// Ce layout s'applique uniquement aux pages sous (dashboard)/.
// AuthGuard protège toutes ces pages côté client.
// Le middleware.ts les protège côté serveur avant même le rendu.

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <RoleNavigation />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
'use client'

import { AuthGuard, RoleNavigation } from '@/components/auth/AuthGuard'
import { Header }                    from '@/components/layout/Header'
import { ToastProvider }             from '@/hooks/useToast'
import { ToastContainer }            from '@/components/ui/Toast'

// Ce layout s'applique uniquement aux pages sous (dashboard)/.
// AuthGuard protège toutes ces pages côté client.
// Le middleware.ts les protège côté serveur avant même le rendu.

/**
 * Layout dashboard :
 * - AuthGuard : protection côté client
 * - ToastProvider : contexte global pour les notifications
 * - ToastContainer : affichage des toasts en bas à droite
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthGuard>
        <div className="flex h-screen overflow-hidden bg-slate-950">
          <RoleNavigation />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
      {/* Rendu en dehors du layout pour éviter tout clipping */}
      <ToastContainer />
    </ToastProvider>
  )
}
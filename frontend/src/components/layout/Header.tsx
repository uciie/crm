'use client'

import { useState }           from 'react'
import { usePathname, useRouter}        from 'next/navigation'
import { Bell, Settings, ChevronDown, LogOut, User, RotateCw } from 'lucide-react'
import { useAuth }            from '@/hooks/useAuth'
import { cn }                 from '@/lib/utils'

// ── Route label map ─────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':  'Tableau de bord',
  '/contacts':   'Contacts',
  '/companies':  'Entreprises',
  '/pipeline':   'Pipeline de vente',
  '/leads':      'Opportunites',
  '/tasks':      'Taches',
  '/campaigns':  'Campagnes',
  '/settings':   'Parametres',
}

function getRouteLabel(pathname: string): string {
  for (const [key, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname.startsWith(key)) return label
  }
  return 'CRM'
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Component ───────────────────────────────────────────────────

export function Header() {
  const pathname             = usePathname()
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const label    = getRouteLabel(pathname)
  const initials = profile ? getInitials(profile.full_name) : '--'

  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    router.push(pathname)
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <header className="h-14 shrink-0 bg-slate-950 border-b border-slate-800/60 flex items-center px-6 gap-4">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-500">
          {label}
        </p>
      </div>
      <button
        onClick={handleRefresh}
        title="Actualiser la page"
        className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-all"
      >
        <RotateCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <button
          className={cn(
            'w-8 h-8 flex items-center justify-center',
            'text-slate-600 hover:text-slate-300 hover:bg-slate-900',
            'border border-transparent hover:border-slate-800',
            'transition-all duration-150'
          )}
          aria-label="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-800 mx-2" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={cn(
              'flex items-center gap-2.5 h-8 pl-1 pr-2',
              'text-slate-400 hover:text-slate-200',
              'border border-transparent hover:border-slate-800 hover:bg-slate-900',
              'transition-all duration-150'
            )}
            aria-expanded={menuOpen}
          >
            <div className="w-6 h-6 bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-slate-300">{initials}</span>
            </div>
            <span className="text-xs font-medium truncate max-w-32 hidden sm:block">
              {profile?.full_name ?? 'Utilisateur'}
            </span>
            <ChevronDown className={cn('w-3 h-3 transition-transform duration-150', menuOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-52 bg-slate-900 border border-slate-800 shadow-2xl shadow-black/50">
                {/* Profile info */}
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-xs font-semibold text-slate-200 truncate">{profile?.full_name}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wider">
                    {profile?.role}
                  </p>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="w-3.5 h-3.5" />
                    Mon profil
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-left"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Parametres
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-slate-800 py-1">
                  <button
                    onClick={() => { setMenuOpen(false); signOut() }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Deconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
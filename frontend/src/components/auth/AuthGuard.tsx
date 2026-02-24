'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname }              from 'next/navigation'
import Link                                    from 'next/link'
import { useAuth }                             from '@/hooks/useAuth'
import { cn }                                  from '@/lib/utils'
import type { UserRole }                       from '@/types'

// ── Auth Guard ────────────────────────────────────────────────

interface AuthGuardProps {
  children:      ReactNode
  requiredRole?: UserRole
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [user, profile, loading, requiredRole, router])

  if (loading)  return <AuthLoadingScreen />
  if (!user)    return null
  if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'admin') return null

  return <>{children}</>
}

// ── Loading screen ────────────────────────────────────────────
// Fond sombre cohérent avec le design Precision Industrial

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner géométrique */}
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border border-slate-700 rounded-full" />
          <div className="absolute inset-0 border-t border-blue-500 rounded-full animate-spin" />
        </div>
        {/* Label */}
        <div className="text-center space-y-1">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-500">
            Vérification en cours
          </p>
          <p className="text-[9px] font-mono text-slate-700">
            Validation de la session...
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Role Gate ─────────────────────────────────────────────────

interface RoleGateProps {
  children:     ReactNode
  allowedRoles: UserRole[]
  fallback?:    ReactNode
}

export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { profile } = useAuth()
  if (!profile) return null
  if (!allowedRoles.includes(profile.role as UserRole)) return <>{fallback}</>
  return <>{children}</>
}

// ── Role Navigation ───────────────────────────────────────────

interface NavItem {
  href:  string
  label: string
  abbr:  string
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', abbr: 'DB', roles: ['admin', 'commercial', 'utilisateur'] },
  { href: '/contacts',  label: 'Contacts',         abbr: 'CT', roles: ['admin', 'commercial', 'utilisateur'] },
  { href: '/companies', label: 'Entreprises',      abbr: 'EN', roles: ['admin', 'commercial', 'utilisateur'] },
  { href: '/pipeline',  label: 'Pipeline',         abbr: 'PL', roles: ['admin', 'commercial'] },
  { href: '/leads',     label: 'Leads',            abbr: 'LD', roles: ['admin', 'commercial'] },
  { href: '/tasks',     label: 'Taches',           abbr: 'TC', roles: ['admin', 'commercial', 'utilisateur'] },
  { href: '/campaigns', label: 'Campagnes',        abbr: 'CP', roles: ['admin', 'commercial'] },
  { href: '/settings',  label: 'Parametres',       abbr: 'ST', roles: ['admin'] },
]

const ROLE_META: Record<UserRole, { label: string; style: string }> = {
  admin:       { label: 'Administrateur', style: 'text-blue-400 bg-blue-950/60 border-blue-800/40' },
  commercial:  { label: 'Commercial',     style: 'text-amber-400 bg-amber-950/60 border-amber-800/40' },
  utilisateur: { label: 'Utilisateur',    style: 'text-slate-400 bg-slate-900 border-slate-700' },
}

function getInitials(fullName: string): string {
  return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function RoleNavigation() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  if (!profile) return null

  const role         = profile.role as UserRole
  const meta         = ROLE_META[role]
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role))

  return (
    <aside className="w-56 bg-slate-950 border-r border-slate-800/60 flex flex-col h-full shrink-0">
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-blue-500/40 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 bg-blue-500" />
          </div>
          <span className="text-slate-200 text-sm font-bold tracking-[0.15em] uppercase">CRM Pro</span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-800/60">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] uppercase border',
          meta.style
        )}>
          {meta.label}
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[9px] font-bold text-slate-700 tracking-[0.2em] uppercase">
          Navigation
        </p>
        {visibleItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-xs font-medium tracking-wide',
                'transition-all duration-150 border',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border-blue-600/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 border-transparent'
              )}
            >
              <span className={cn(
                'w-6 h-5 flex items-center justify-center text-[9px] font-mono font-bold',
                isActive ? 'text-blue-400' : 'text-slate-700'
              )}>
                {item.abbr}
              </span>
              {item.label}
              {isActive && <span className="ml-auto w-1 h-1 rounded-full bg-blue-400 shrink-0" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-slate-300">
              {getInitials(profile.full_name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300 truncate">{profile.full_name}</p>
            <p className="text-[10px] text-slate-600">{meta.label}</p>
          </div>
          <button
            onClick={signOut}
            title="Deconnexion"
            className="w-7 h-7 flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-950/20 transition-all text-xs"
          >
            &#x2192;
          </button>
        </div>
      </div>
    </aside>
  )
}
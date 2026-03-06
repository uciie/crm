'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  Target,
  CheckSquare,
  Mail,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth }     from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'

// Chaque item dispose d'une icone Lucide — aucun emoji
const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/contacts',   label: 'Contacts',    icon: Users },
  { href: '/companies',  label: 'Entreprises', icon: Building2 },
  { href: '/pipeline',   label: 'Pipeline',    icon: GitBranch },
  { href: '/leads',      label: 'Leads',       icon: Target },
  { href: '/tasks',      label: 'Tâches',      icon: CheckSquare },
  { href: '/campaigns',  label: 'Campagnes',   icon: Mail },
  { href: '/settings',   label: 'Paramètres',  icon: Settings, adminOnly: true },
]

export function Sidebar() {
  const pathname    = usePathname()
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <span className="font-bold text-gray-900">CRM Pro</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => {
          const active = pathname.startsWith(item.href)
          const Icon   = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600' : 'text-gray-400'}`}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Profil + Deconnexion */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile
              ? getInitials(profile.full_name.split(' ')[0], profile.full_name.split(' ')[1] ?? '')
              : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-gray-400 capitalize">{profile?.role}</p>
          </div>

          {/* Bouton deconnexion — icone LogOut de Lucide, aucun emoji */}
          <button
            onClick={signOut}
            title="Déconnexion"
            aria-label="Se déconnecter"
            className="text-gray-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}
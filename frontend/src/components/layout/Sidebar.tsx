'use client'
import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth }     from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: '📊' },
  { href: '/contacts',   label: 'Contacts',   icon: '👥' },
  { href: '/companies',  label: 'Entreprises', icon: '🏢' },
  { href: '/pipeline',   label: 'Pipeline',   icon: '🏗️' },
  { href: '/leads',      label: 'Leads',      icon: '🎯' },
  { href: '/tasks',      label: 'Tâches',     icon: '✅' },
  { href: '/campaigns',  label: 'Campagnes',  icon: '📨' },
  { href: '/settings',   label: 'Paramètres', icon: '⚙️', adminOnly: true },
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
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Profil */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile ? getInitials(profile.full_name.split(' ')[0], profile.full_name.split(' ')[1] ?? '') : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-gray-400 capitalize">{profile?.role}</p>
          </div>
          <button onClick={signOut} title="Déconnexion"
            className="text-gray-400 hover:text-red-500 transition text-sm">
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
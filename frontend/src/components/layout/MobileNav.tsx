'use client'
import Link            from 'next/link'
import { usePathname } from 'next/navigation'

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home',    icon: '📊' },
  { href: '/contacts',  label: 'Contacts', icon: '👥' },
  { href: '/pipeline',  label: 'Pipeline', icon: '🏗️' },
  { href: '/tasks',     label: 'Tâches',  icon: '✅' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden z-40">
      {MOBILE_NAV.map(item => (
        <Link key={item.href} href={item.href}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition ${
            pathname.startsWith(item.href) ? 'text-indigo-600' : 'text-gray-500'
          }`}>
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
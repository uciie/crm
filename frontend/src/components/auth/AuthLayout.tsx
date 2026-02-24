import type { ReactNode } from 'react'
import Link from 'next/link'

interface AuthLayoutProps {
  children:   ReactNode
  title:      string
  subtitle?:  string
  backHref?:  string
  backLabel?: string
}

export function AuthLayout({ children, title, subtitle, backHref, backLabel }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* Left decorative column - only on lg+ */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-slate-900 border-r border-slate-800/60 p-10 relative overflow-hidden shrink-0">

        {/* Background geometry */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(to right, #64748b 1px, transparent 1px),
                linear-gradient(to bottom, #64748b 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-600/5 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-600/3 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-8 h-8 border border-blue-500/40 flex items-center justify-center shrink-0">
            <div className="w-3 h-3 bg-blue-500" />
          </div>
          <span className="text-slate-200 text-sm font-bold tracking-[0.18em] uppercase">CRM Pro</span>
        </div>

        {/* Feature list */}
        <div className="mt-auto relative space-y-6">
          {[
            { label: 'Pipeline de vente', desc: 'Kanban visuel, drag & drop, probabilites.' },
            { label: 'Gestion contacts',  desc: 'Base centralisee, historique complet.' },
            { label: 'Campagnes email',   desc: 'Integration Brevo, stats en temps reel.' },
          ].map((f, i) => (
            <div key={f.label} className="flex items-start gap-4">
              <div className="w-6 h-6 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-0.5">{f.label}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tag */}
        <p className="mt-8 text-[10px] font-mono text-slate-700 tracking-widest relative">
          ACCES SECURISE / JWT + RLS
        </p>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-7 h-7 border border-blue-500/40 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-blue-500" />
            </div>
            <span className="text-slate-200 text-sm font-bold tracking-[0.15em] uppercase">CRM Pro</span>
          </div>

          {/* Back link */}
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600 hover:text-slate-300 transition-colors mb-8 group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform inline-block">&#8592;</span>
              {backLabel ?? 'Retour'}
            </Link>
          )}

          {/* Page header */}
          <div className="mb-8">
            <div className="h-px bg-gradient-to-r from-blue-500/60 to-transparent mb-6 w-16" />
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{subtitle}</p>
            )}
          </div>

          {/* Form card */}
          <div className="bg-slate-900/70 border border-slate-800 p-8 backdrop-blur-sm">
            {children}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[10px] font-mono text-slate-800 tracking-[0.15em] uppercase">
            Systeme securise — Controle d'acces par roles
          </p>
        </div>
      </div>
    </div>
  )
}
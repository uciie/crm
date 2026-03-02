'use client'
import { useState, useCallback } from 'react'
import {
  PlusCircle, RefreshCcw, CheckCircle2, XCircle,
  UserPlus, TrendingUp,
} from 'lucide-react'
import { useLeads }       from '@/hooks/useLeads'
import { useAuth }        from '@/hooks/useAuth'
import { leadsService }   from '@/services/leads.service'
import { LeadForm }       from '@/components/leads/LeadForm'
import { TableSkeleton }  from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn }             from '@/lib/utils'
import type { Lead }      from '@/types'

// Icones Lucide par statut — aucun emoji
const STATUS_CFG: Record<string, {
  icon:  React.ElementType
  label: string
  cls:   string
}> = {
  nouveau:     { icon: PlusCircle,   label: 'Nouveau',     cls: 'text-slate-400 bg-slate-900 border-slate-700' },
  contacté:    { icon: RefreshCcw,   label: 'Contacté',    cls: 'text-blue-400 bg-blue-950/40 border-blue-800/40' },
  qualifié:    { icon: RefreshCcw,   label: 'Qualifié',    cls: 'text-amber-400 bg-amber-950/40 border-amber-800/40' },
  proposition: { icon: RefreshCcw,   label: 'Proposition', cls: 'text-violet-400 bg-violet-950/40 border-violet-800/40' },
  négociation: { icon: RefreshCcw,   label: 'Négociation', cls: 'text-orange-400 bg-orange-950/40 border-orange-800/40' },
  gagné:       { icon: CheckCircle2, label: 'Gagné',       cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' },
  perdu:       { icon: XCircle,      label: 'Perdu',       cls: 'text-red-400 bg-red-950/40 border-red-800/40' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.nouveau
  const Icon = cfg.icon
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase border',
      cfg.cls
    )}>
      <Icon className="w-2.5 h-2.5" aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

export default function LeadsPage() {
  const { leads, loading, refetch } = useLeads()
  const { isCommercial }            = useAuth()
  const [showForm, setShowForm]     = useState(false)
  const [editLead, setEditLead]     = useState<Lead | null>(null)

  const handleSaved = useCallback(() => {
    setShowForm(false)
    setEditLead(null)
    refetch()
  }, [refetch])

  return (
    <div className="flex flex-col gap-5 h-full p-6">
      {/* En-tete */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-slate-200">Leads</h1>
          </div>
          <p className="text-xs text-slate-600">{leads.length} opportunité{leads.length !== 1 ? 's' : ''}</p>
        </div>
        {isCommercial && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Nouveau lead
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-slate-900 border border-slate-800 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-950/60 border-b border-slate-800">
              <tr>
                {['Opportunité', 'Contact', 'Valeur', 'Probabilité', 'Statut', 'Clôture'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <TableSkeleton rows={8} cols={6} />
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-600 text-sm">
                    Aucun lead trouvé
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    onClick={() => isCommercial && setEditLead(lead)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-200">{lead.title}</p>
                      {lead.company && <p className="text-xs text-slate-600 mt-0.5">{lead.company.name}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">
                      {lead.contact ? `${lead.contact.first_name} ${lead.contact.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-200">
                      {formatCurrency(lead.value)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-slate-800 overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${lead.probability}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{lead.probability}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {formatDate(lead.expected_close_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulaire création/édition */}
      {(showForm || editLead) && (
        <LeadForm
          lead={editLead}
          onClose={() => { setShowForm(false); setEditLead(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
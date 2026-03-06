'use client'
// ============================================================
// app/(dashboard)/leads/page.tsx
// ============================================================

import { useState, useCallback } from 'react'
import { useRouter }             from 'next/navigation'
import {
  PlusCircle, RefreshCcw, CheckCircle2, XCircle,
  UserPlus, TrendingUp, Trash2, ArrowUpRight, Loader2, Pencil,
} from 'lucide-react'
import { useLeads }      from '@/hooks/useLeads'
import { useAuth }       from '@/hooks/useAuth'
import { leadsService }  from '@/services/leads.service'
import { LeadForm }      from '@/components/leads/LeadForm'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn }            from '@/lib/utils'
import type { Lead }     from '@/types'

// ── Tooltip ───────────────────────────────────────────────────

interface TooltipProps {
  label:     string
  children:  React.ReactNode
  position?: 'top' | 'bottom'
}

function Tooltip({ label, children, position = 'top' }: TooltipProps) {
  return (
    <div className="relative group/tip inline-flex">
      {children}
      <div
        className={[
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50',
          'opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 delay-100',
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        ].join(' ')}
      >
        <div className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold tracking-[0.15em] uppercase px-2.5 py-1.5 whitespace-nowrap shadow-xl shadow-black/40">
          {label}
        </div>
        {position === 'top' ? (
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        ) : (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-700" />
        )}
      </div>
    </div>
  )
}

// ── Icones statut (Lucide) ────────────────────────────────────

const STATUS_CFG: Record<string, {
  icon:  React.ElementType
  label: string
  cls:   string
}> = {
  nouveau:     { icon: PlusCircle,   label: 'Nouveau',     cls: 'text-slate-400 bg-slate-900 border-slate-700' },
  contacte:    { icon: RefreshCcw,   label: 'Contacté',    cls: 'text-blue-400 bg-blue-950/40 border-blue-800/40' },
  qualifie:    { icon: RefreshCcw,   label: 'Qualifié',    cls: 'text-amber-400 bg-amber-950/40 border-amber-800/40' },
  proposition: { icon: RefreshCcw,   label: 'Proposition', cls: 'text-violet-400 bg-violet-950/40 border-violet-800/40' },
  negociation: { icon: RefreshCcw,   label: 'Négociation', cls: 'text-orange-400 bg-orange-950/40 border-orange-800/40' },
  gagne:       { icon: CheckCircle2, label: 'Gagné',       cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' },
  perdu:       { icon: XCircle,      label: 'Perdu',       cls: 'text-red-400 bg-red-950/40 border-red-800/40' },
}

function StatusBadge({ status }: { status: string }) {
  const key  = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const cfg  = STATUS_CFG[key] ?? STATUS_CFG.nouveau
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

// ── Page ──────────────────────────────────────────────────────

export default function LeadsPage() {
  const router                          = useRouter()          // FIX 1: useRouter hook, pas l import direct
  const { leads, loading, refetch }     = useLeads()
  const { isAdmin, isCommercial }       = useAuth()
  const [showForm, setShowForm]         = useState(false)
  const [editLead, setEditLead]         = useState<Lead | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null) // FIX 2: etat manquant

  // FIX 3: handler delete manquant
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce lead ?')) return
    setDeletingId(id)
    try {
      await leadsService.remove(id)
      refetch()
    } catch (err: any) {
      alert(err?.message ?? 'Erreur lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }, [refetch])

  const handleSaved = useCallback(() => {
    setShowForm(false)
    setEditLead(null)
    refetch()
  }, [refetch])

  // FIX 4: ouvrir le formulaire d edition correctement
  const handleEdit = useCallback((lead: Lead) => {
    setEditLead(lead)
    setShowForm(true)   // FIX: setShowModal -> setShowForm
  }, [])

  return (
    <div className="flex flex-col gap-5 h-full p-6">

      {/* En-tete */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-slate-200">Leads</h1>
          </div>
          <p className="text-xs text-slate-600">
            {leads.length} opportunit{leads.length !== 1 ? 'és' : 'é'}
          </p>
        </div>
        {isCommercial && (
          <button
            onClick={() => { setEditLead(null); setShowForm(true) }}
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
                {/* FIX 5: colonne Actions ajoutee dans les headers */}
                {['Opportunité', 'Contact', 'Valeur', 'Probabilité', 'Statut', 'Clôture', ''].map((h, i) => (
                  <th key={i} className={cn(
                    'px-5 py-3.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600',
                    i === 6 ? 'text-right' : 'text-left'
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <TableSkeleton rows={8} cols={7} />
              ) : leads.length === 0 ? (
                <tr>
                  {/* FIX 6: colSpan 6 -> 7 */}
                  <td colSpan={7} className="text-center py-16 text-slate-600 text-sm">
                    Aucun lead trouvé
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-800/30 transition-colors group"
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

                    {/* Colonne actions */}
                    <td
                      className="px-5 py-3.5 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        
                        {isCommercial && (
                          <Tooltip label="Ouvrir">
                            <button
                              onClick={() => router.push(`/leads/${lead.id}`)}
                              className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all"
                              aria-label={`Ouvrir ${lead.title}`}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}

                        {isCommercial && (
                          <Tooltip label="Modifier">
                            <button
                              onClick={() => handleEdit(lead)}
                              className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all"
                              aria-label={`Modifier ${lead.title}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        )}

                        {isAdmin && (
                          <Tooltip label="Supprimer">
                            <button
                              onClick={() => handleDelete(lead.id)}
                              disabled={deletingId === lead.id}
                              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-all disabled:opacity-40"
                              aria-label={`Supprimer ${lead.title}`}
                            >
                              {deletingId === lead.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                : <Trash2   className="w-3.5 h-3.5" />
                              }
                            </button>
                          </Tooltip>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulaire creation / edition */}
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
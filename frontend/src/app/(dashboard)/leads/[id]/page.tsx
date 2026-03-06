'use client'
// ============================================================
// app/(dashboard)/leads/[id]/page.tsx
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams }             from 'next/navigation'
import {
  ArrowLeft, TrendingUp, CheckCircle2, XCircle,
  PlusCircle, RefreshCcw, Pencil, Trash2,
  Calendar, Target, User,
  Building2, Tag, FileText, Clock,
  Phone, Mail, MessageSquare, Users,
  Loader2, ChevronRight,
} from 'lucide-react'
import { leadsService }     from '@/services/leads.service'
import { useToast }         from '@/hooks/useToast'
import { useAuth }          from '@/hooks/useAuth'
import { LeadForm }         from '@/components/leads/LeadForm'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Lead }        from '@/types'

// ── Types ─────────────────────────────────────────────────────

interface Communication {
  id:            string
  type:          'email' | 'appel' | 'réunion' | 'note' | 'sms'
  subject?:      string
  body?:         string
  direction?:    string
  duration_min?: number
  occurred_at:   string
  author?: { full_name: string; avatar_url?: string }
}

// ── Config ────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
  nouveau:     { icon: PlusCircle,   label: 'Nouveau',     cls: 'text-slate-400  bg-slate-900       border-slate-700' },
  'contacté':  { icon: RefreshCcw,   label: 'Contacté',    cls: 'text-blue-400   bg-blue-950/40     border-blue-800/40' },
  'qualifié':  { icon: RefreshCcw,   label: 'Qualifié',    cls: 'text-amber-400  bg-amber-950/40    border-amber-800/40' },
  proposition: { icon: RefreshCcw,   label: 'Proposition', cls: 'text-violet-400 bg-violet-950/40   border-violet-800/40' },
  'négociation':{ icon: RefreshCcw,  label: 'Négociation', cls: 'text-orange-400 bg-orange-950/40   border-orange-800/40' },
  'gagné':     { icon: CheckCircle2, label: 'Gagné',       cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' },
  perdu:       { icon: XCircle,      label: 'Perdu',       cls: 'text-red-400    bg-red-950/40      border-red-800/40' },
}

const COMM_ICONS: Record<string, { icon: React.ElementType; cls: string }> = {
  email:   { icon: Mail,          cls: 'text-blue-400   bg-blue-950/40' },
  appel:   { icon: Phone,         cls: 'text-green-400  bg-green-950/40' },
  réunion: { icon: Users,         cls: 'text-violet-400 bg-violet-950/40' },
  note:    { icon: FileText,      cls: 'text-slate-400  bg-slate-800' },
  sms:     { icon: MessageSquare, cls: 'text-amber-400  bg-amber-950/40' },
}

// ── Helper : aplatit la réponse Drizzle jointé ────────────────
// Drizzle retourne { leads: {...}, contacts: null, companies: null, profiles: {...} }
// On transforme ça en un objet Lead flat que la page peut utiliser directement.

function flattenLead(raw: any): Lead {
  if (raw?.leads) {
    return {
      ...raw.leads,
      contact:  raw.contacts  ?? undefined,
      company:  raw.companies ?? undefined,
      assignee: raw.profiles  ?? undefined,
    }
  }
  // Déjà flat (certains services retournent directement le lead)
  return raw
}

// ── Composants ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.nouveau
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase border', cfg.cls)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800/60 last:border-0">
      <div className="w-7 h-7 flex items-center justify-center bg-slate-800/50 mt-0.5 shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div>
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-0.5">{label}</p>
        <p className="text-sm text-slate-300">{value}</p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const router                    = useRouter()
  const params                    = useParams()
  const { toast }                 = useToast()
  const { isAdmin, isCommercial } = useAuth()

  const [lead, setLead]               = useState<Lead | null>(null)
  const [comms, setComms]             = useState<Communication[]>([])
  const [loading, setLoading]         = useState(true)
  const [showEdit, setShowEdit]       = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [activeTab, setActiveTab]     = useState<'overview' | 'timeline'>('overview')

  const id = params?.id as string

  const fetchLead = useCallback(async () => {
    if (!id) return
    try {
      const raw  = await leadsService.findOne(id)
      const flat = flattenLead(raw)   // ← aplatis ici
      setLead(flat)
    } catch {
      toast('error', 'Lead introuvable', '')
      router.push('/leads')
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  const fetchTimeline = useCallback(async () => {
    if (!id) return
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const token  = typeof window !== 'undefined'
        ? (localStorage.getItem('supabase_token') ?? localStorage.getItem('token') ?? '')
        : ''
      const res  = await fetch(`${apiUrl}/api/v1/communications/timeline?lead_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setComms(json.data ?? [])
    } catch { /* silencieux — la timeline est optionnelle */ }
  }, [id])

  useEffect(() => {
    fetchLead()
    fetchTimeline()
  }, [fetchLead, fetchTimeline])

  const handleDelete = async () => {
    if (!confirm(`Supprimer "${lead?.title}" ?`)) return
    setDeleting(true)
    try {
      await leadsService.remove(id)
      toast('success', 'Lead supprimé', '')
      router.push('/leads')
    } catch (err: any) {
      toast('error', 'Erreur', err?.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!lead) return null

  const probability   = Number(lead.probability ?? 0)
  const value         = Number(lead.value ?? 0)
  const createdAt     = lead.created_at ? new Date(lead.created_at) : null
  const daysSince     = createdAt
    ? Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
    : '—'

  return (
    <div className="flex flex-col h-full">

      {/* Barre du haut */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/leads')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Leads
          </button>
          <ChevronRight className="w-3 h-3 text-slate-700" />
          <span className="text-xs text-slate-400 font-medium truncate max-w-[220px]">{lead.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {isCommercial && (
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wider uppercase text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-200 transition-all"
            >
              <Pencil className="w-3 h-3" /> Modifier
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wider uppercase text-red-500/70 border border-red-900/40 hover:border-red-700/60 hover:text-red-400 transition-all disabled:opacity-40"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Corps */}
      <div className="flex flex-1 overflow-hidden">

        {/* Colonne gauche */}
        <div className="w-80 shrink-0 border-r border-slate-800 overflow-y-auto bg-slate-950/30">
          <div className="p-6">

            <div className="mb-6">
              <div className="h-px w-8 bg-blue-500 mb-3" />
              <h1 className="text-base font-bold text-slate-100 leading-snug mb-3">{lead.title}</h1>
              <StatusBadge status={lead.status} />
            </div>

            {/* Cartes valeur / probabilité */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-900 border border-slate-800 p-3">
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-1">Valeur</p>
                <p className="text-lg font-bold text-slate-100">{formatCurrency(value)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3">
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-1">Probabilité</p>
                <p className="text-lg font-bold text-slate-100">{probability}%</p>
                <div className="w-full h-1 bg-slate-800 mt-2">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${probability}%` }} />
                </div>
              </div>
            </div>

            {/* Infos */}
            <div>
              {lead.contact && (
                <InfoRow icon={User} label="Contact"
                  value={`${lead.contact.first_name} ${lead.contact.last_name}`} />
              )}
              {lead.company && (
                <InfoRow icon={Building2} label="Entreprise" value={lead.company.name} />
              )}
              {lead.assignee && (
                <InfoRow icon={Target} label="Assigné à" value={lead.assignee.full_name} />
              )}
              <InfoRow icon={Tag}      label="Source"        value={lead.source} />
              <InfoRow icon={Calendar} label="Clôture prévue" value={formatDate(lead.expected_close_date)} />
              <InfoRow icon={Clock}    label="Créé le"        value={createdAt ? formatDate(lead.created_at) : undefined} />
            </div>

            {lead.notes && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600 mb-2">Notes</p>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-800 mb-6">
              {(['overview', 'timeline'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn(
                    'pb-3 text-[10px] font-bold tracking-[0.18em] uppercase transition-colors border-b-2 -mb-px',
                    activeTab === tab
                      ? 'text-blue-400 border-blue-500'
                      : 'text-slate-600 border-transparent hover:text-slate-400'
                  )}>
                  {tab === 'overview' ? 'Aperçu' : 'Timeline'}
                </button>
              ))}
            </div>

            {/* Aperçu */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: 'Valeur pondérée',
                    value: formatCurrency(value * probability / 100),
                    icon:  TrendingUp,
                  },
                  {
                    label: 'Communications',
                    value: String(comms.length),
                    icon:  MessageSquare,
                  },
                  {
                    label: 'Jours depuis création',
                    value: String(daysSince),
                    icon:  Clock,
                  },
                ].map(card => (
                  <div key={card.label} className="bg-slate-900 border border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon className="w-3.5 h-3.5 text-slate-600" />
                      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-slate-600">{card.label}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-100">{card.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            {activeTab === 'timeline' && (
              <div>
                {comms.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">Aucune communication enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comms.map((comm, i) => {
                      const cfg  = COMM_ICONS[comm.type] ?? COMM_ICONS.note
                      const Icon = cfg.icon
                      return (
                        <div key={comm.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn('w-7 h-7 flex items-center justify-center shrink-0', cfg.cls)}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            {i < comms.length - 1 && (
                              <div className="w-px flex-1 bg-slate-800 mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-300">{comm.subject ?? comm.type}</p>
                                {comm.body && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{comm.body}</p>}
                                {comm.author && <p className="text-[10px] text-slate-600 mt-1">par {comm.author.full_name}</p>}
                              </div>
                              <p className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">
                                {formatDate(comm.occurred_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modale édition */}
      {showEdit && (
        <LeadForm
          lead={lead}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setLead(flattenLead(updated))
            setShowEdit(false)
            toast('success', 'Lead modifié', updated.title ?? '')
          }}
        />
      )}
    </div>
  )
}
'use client'
// ============================================================
// app/(dashboard)/campaigns/page.tsx
// ============================================================

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus,
  Mail, RefreshCw, Plus,
  BarChart2, TableIcon, Loader2, Eye, X,
} from 'lucide-react'
import { api }                from '@/lib/api'
import { Badge }              from '@/components/ui/Badge'
import { Spinner }            from '@/components/ui/Spinner'
import { Button }             from '@/components/ui/Button'
import { formatDate }         from '@/lib/utils'
import { CampaignModal }      from '@/components/campaigns/CampaignModal'
import type { EmailCampaign } from '@/types'
import { calculateRoi }       from '@/lib/utils'


// ── Helpers ───────────────────────────────────────────────────

function formatRoi(roi: number | null | undefined): string {
  if (roi === null || roi === undefined) return '—'
  return `${roi >= 0 ? '+' : ''}${roi}%`
}

const STATUS_CFG = {
  brouillon: { color: '#94a3b8', bg: '#f8fafc', label: 'Brouillon' },
  planifiée: { color: '#f59e0b', bg: '#fffbeb', label: 'Planifiée'  },
  envoyée:   { color: '#34d399', bg: '#f0fdf4', label: 'Envoyée'    },
} as const

const PERF_COLORS = {
  open:   '#60a5fa',
  click:  '#34d399',
}

// ── Sous-composants ───────────────────────────────────────────

function RoiBadge({ roi }: { roi: number | null | undefined }) {
  if (roi === null || roi === undefined) return <span className="text-xs text-gray-400">—</span>
  const isPos = roi >= 0
  const Icon  = roi === 0 ? Minus : isPos ? TrendingUp : TrendingDown
  const color = roi === 0 ? 'text-gray-400' : isPos ? 'text-emerald-500' : 'text-red-400'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {formatRoi(roi)}
    </span>
  )
}

function PerfTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs space-y-1 min-w-[160px]">
      <p className="font-bold text-gray-700 mb-1.5 border-b border-gray-100 pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-gray-500">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-800">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

function RoiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const roi = payload[0]?.value
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      <p className={`font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
        ROI : {formatRoi(roi)}
      </p>
    </div>
  )
}

// ── Modal prévisualisation HTML ───────────────────────────────

function HtmlPreviewModal({
  campaign,
  onClose,
}: {
  campaign: EmailCampaign & { htmlContent?: string }
  onClose:  () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Prévisualisation : ${campaign.name}`}
    >
      <div className="bg-slate-950 border border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-0.5">
              Prévisualisation
            </p>
            <p className="text-sm font-bold text-slate-200 truncate">{campaign.name}</p>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">Objet : {campaign.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-900 transition-all ml-4 shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats rapides */}
        {campaign.status === 'envoyée' && (
          <div className="flex items-center gap-6 px-5 py-2.5 border-b border-slate-800 bg-slate-900/40 shrink-0">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              {campaign.sent_count.toLocaleString('fr-FR')} envois
            </span>
            {campaign.open_rate != null && (
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
                {campaign.open_rate}% ouverture
              </span>
            )}
            {campaign.click_rate != null && (
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                {campaign.click_rate}% clic
              </span>
            )}
          </div>
        )}

        {/* iFrame rendu HTML */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {campaign.htmlContent ? (
            <iframe
              srcDoc={campaign.htmlContent}
              title={`Prévisualisation : ${campaign.name}`}
              className="w-full h-full border-0"
              style={{ minHeight: '480px' }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-60 text-sm text-slate-500">
              Aucun contenu HTML disponible
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns]   = useState<(EmailCampaign & { htmlContent?: string })[]>([])
  const [loading, setLoading]       = useState(true)
  const [syncing, setSyncing]       = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [preview, setPreview]       = useState<(EmailCampaign & { htmlContent?: string }) | null>(null)
  const [view, setView]             = useState<'table' | 'charts'>('table')

  const loadCampaigns = () => {
    setLoading(true)
    api.get<EmailCampaign[]>('/email/campaigns')
      .then(rows => {
        const enriched = rows.map(c => ({
          ...c,
          open_rate:  c.open_rate  != null ? Number(c.open_rate)  : undefined,
          click_rate: c.click_rate != null ? Number(c.click_rate) : undefined,
          roi:        c.roi ?? calculateRoi(c.cost, c.revenue_generated),
        }))
        setCampaigns(enriched)
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCampaigns() }, [])

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      const sent = campaigns.filter(c => c.status === 'envoyée')
      await Promise.all(sent.map(c => api.patch(`/email/campaigns/${c.id}/sync`, {})))
      loadCampaigns()
    } finally {
      setSyncing(false)
    }
  }

  const perfChartData = useMemo(() =>
    campaigns
      .filter(c => c.status === 'envoyée' && c.sent_count > 0)
      .map(c => ({
        name:         c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
        'Taux ouv.':  c.open_rate  ?? 0,
        'Taux clic':  c.click_rate ?? 0,
      })),
    [campaigns]
  )

  const roiChartData = useMemo(() =>
    campaigns
      .filter(c => c.status === 'envoyée' && Number(c.cost ?? 0) > 0)
      .map(c => ({
        name: c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
        roi:  c.roi ?? calculateRoi(c.cost, c.revenue_generated) ?? 0,
      })),
    [campaigns]
  )

  const kpis = useMemo(() => {
    const sent        = campaigns.filter(c => c.status === 'envoyée')
    const totalSent   = sent.reduce((s, c) => s + (c.sent_count ?? 0), 0)
    const avgOpen     = sent.length ? sent.reduce((s, c) => s + (c.open_rate ?? 0), 0) / sent.length : null
    const avgClick    = sent.length ? sent.reduce((s, c) => s + (c.click_rate ?? 0), 0) / sent.length : null
    const totalRevenue = sent.reduce((s, c) => s + Number(c.revenue_generated ?? 0), 0)
    return { totalSent, avgOpen, avgClick, totalRevenue, sentCount: sent.length }
  }, [campaigns])

  return (
    <div className="p-6 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Campagnes email</h1>
          <p className="text-sm text-gray-500">Powered by Brevo</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'table' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Tableau
            </button>
            <button
              onClick={() => setView('charts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'charts' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Graphiques
            </button>
          </div>

          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-40 rounded"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync Brevo
          </button>

          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Emails envoyés',  value: kpis.totalSent.toLocaleString('fr-FR'),                                                         sub: `${kpis.sentCount} campagne${kpis.sentCount !== 1 ? 's' : ''}`, icon: Mail,       color: 'text-blue-400'    },
          { label: 'Ouverture moy.', value: kpis.avgOpen  !== null ? `${kpis.avgOpen.toFixed(1)}%`  : '—',                                   sub: 'Taux moyen toutes campagnes',                                  icon: BarChart2,   color: 'text-violet-400'  },
          { label: 'Clic moyen',     value: kpis.avgClick !== null ? `${kpis.avgClick.toFixed(1)}%` : '—',                                   sub: 'Taux moyen toutes campagnes',                                  icon: TrendingUp,  color: 'text-emerald-400' },
          { label: 'CA généré',      value: kpis.totalRevenue > 0 ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(kpis.totalRevenue) : '—',            sub: 'Revenus attribués aux campagnes',                              icon: TrendingUp,  color: 'text-amber-400'   },
        ].map(card => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 mb-1.5">{card.label}</p>
                <p className="text-xl font-bold text-slate-100">{card.value}</p>
                <p className="text-[11px] text-slate-600 mt-1">{card.sub}</p>
              </div>
              <card.icon className={`w-4 h-4 shrink-0 mt-0.5 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {/* ── VUE TABLEAU ───────────────────────────────────── */}
          {view === 'table' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Campagne', 'Statut', 'Envois', 'Taux ouv.', 'Taux clic', 'Coût', 'CA généré', 'ROI', 'Planifiée le', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map(c => {
                    const scfg = STATUS_CFG[c.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.brouillon
                    const roi  = c.roi ?? calculateRoi(c.cost, c.revenue_generated)
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.subject}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge label={scfg.label} color={scfg.color} bg={scfg.bg} />
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">
                          {c.sent_count.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700">
                          {c.open_rate  != null ? `${c.open_rate}%`  : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700">
                          {c.click_rate != null ? `${c.click_rate}%` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 tabular-nums">
                          {Number(c.cost ?? 0) > 0 ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(c.cost)) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">
                          {Number(c.revenue_generated ?? 0) > 0 ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(c.revenue_generated)) : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <RoiBadge roi={roi} />
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {formatDate(c.scheduled_at ?? c.sent_at)}
                        </td>
                        {/* Bouton prévisualisation */}
                        <td className="px-3 py-3.5">
                          {c.htmlContent && (
                            <button
                              onClick={() => setPreview(c)}
                              title="Prévisualiser le HTML"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 border border-slate-200 hover:border-blue-400 hover:text-blue-500 transition-colors rounded"
                            >
                              <Eye className="w-3 h-3" />
                              Aperçu
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-gray-400 text-sm">
                        Aucune campagne
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── VUE GRAPHIQUES ────────────────────────────────── */}
          {view === 'charts' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800">Performances d'engagement</p>
                  <p className="text-xs text-gray-400 mt-0.5">Taux d'ouverture et de clic par campagne envoyée</p>
                </div>
                {perfChartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-xs text-gray-400">Aucune donnée</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={perfChartData} barSize={20} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} unit="%" />
                      <RechartsTooltip content={<PerfTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '8px' }} iconType="circle" iconSize={8} />
                      <Bar dataKey="Taux ouv."  fill={PERF_COLORS.open}  radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Taux clic" fill={PERF_COLORS.click} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800">ROI par campagne</p>
                  <p className="text-xs text-gray-400 mt-0.5">(CA − coût) / coût × 100</p>
                </div>
                {roiChartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-xs text-gray-400">Renseignez coût et CA pour afficher le ROI</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={roiChartData} barSize={28} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} unit="%" tickFormatter={v => `${v > 0 ? '+' : ''}${v}`} />
                      <RechartsTooltip content={<RoiTooltip />} />
                      <Bar dataKey="roi" radius={[3, 3, 0, 0]}>
                        {roiChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.roi >= 0 ? '#34d399' : '#f87171'} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-2">
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800">Évolution des performances dans le temps</p>
                  <p className="text-xs text-gray-400 mt-0.5">Taux d'ouverture et de clic au fil des campagnes</p>
                </div>
                {perfChartData.length < 2 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-gray-400">Au moins 2 campagnes envoyées nécessaires</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={perfChartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} unit="%" />
                      <RechartsTooltip content={<PerfTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '8px' }} iconType="circle" iconSize={8} />
                      <Line type="monotone" dataKey="Taux ouv."  stroke={PERF_COLORS.open}  strokeWidth={2} dot={{ fill: PERF_COLORS.open,  r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Taux clic" stroke={PERF_COLORS.click} strokeWidth={2} dot={{ fill: PERF_COLORS.click, r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Grille aperçus HTML en mode graphiques */}
              <div className="xl:col-span-2">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-3">
                  Aperçus des contenus email
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {campaigns.filter(c => c.htmlContent).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setPreview(c)}
                      className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden text-left hover:border-blue-400 hover:shadow-lg transition-all"
                    >
                      {/* Mini iframe non-interactive */}
                      <div className="w-full h-40 overflow-hidden pointer-events-none">
                        <iframe
                          srcDoc={c.htmlContent}
                          title={c.name}
                          className="w-full border-0 origin-top-left"
                          style={{ transform: 'scale(0.45)', width: '222%', height: '222%', pointerEvents: 'none' }}
                          sandbox="allow-same-origin"
                          tabIndex={-1}
                        />
                      </div>
                      {/* Overlay au hover */}
                      <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="flex items-center gap-1.5 bg-white/95 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full shadow">
                          <Eye className="w-3.5 h-3.5" /> Agrandir
                        </span>
                      </div>
                      {/* Label */}
                      <div className="px-3 py-2.5 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-800 truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.subject}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* Modal nouvelle campagne */}
      {showModal && (
        <CampaignModal
          onClose={() => setShowModal(false)}
          onSaved={newCampaign => {
            setShowModal(false)
            setCampaigns(prev => [newCampaign, ...prev])
          }}
        />
      )}

      {/* Modal prévisualisation HTML */}
      {preview && (
        <HtmlPreviewModal
          campaign={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
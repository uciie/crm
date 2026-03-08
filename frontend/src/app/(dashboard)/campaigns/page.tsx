'use client'
// ============================================================
// app/(dashboard)/campaigns/page.tsx
// Campagnes email — tableau + graphiques de performance + ROI
//
// Flux de données réelles (Brevo) :
//   1. Brevo POST /webhooks/brevo → webhooks.controller.ts
//      → EVENT_TO_STATUS mappe 'delivered'/'opened'/'click'
//      → met à jour communications.status pour les emails transac.
//      → touche email_campaigns.updated_at pour les événements campagne
//   2. PATCH /email/campaigns/:id/sync → email.service.syncCampaignStats()
//      → récupère open_rate / click_rate / sent_count depuis l'API Brevo
//   3. PATCH /email/campaigns/:id/financials (à implémenter si besoin)
//      → met à jour cost / revenue_generated → recalcule roi via calculateAndSaveRoi()
//
// En l'absence de données réelles, MOCK_CAMPAIGNS est injecté
// automatiquement (voir flag USE_MOCK_DATA ci-dessous).
// ============================================================

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus,
  Mail, RefreshCw, Plus, AlertCircle,
  BarChart2, TableIcon, Loader2,
} from 'lucide-react'
import { api }                from '@/lib/api'
import { Badge }              from '@/components/ui/Badge'
import { Spinner }            from '@/components/ui/Spinner'
import { Button }             from '@/components/ui/Button'
import { formatDate }         from '@/lib/utils'
import { CampaignModal }      from '@/components/campaigns/CampaignModal'
import type { EmailCampaign } from '@/types'

// ── Flag mock — passer à false dès que Brevo est branché ─────
const USE_MOCK_DATA = true

// ── Mock data ─────────────────────────────────────────────────
// Permet de tester l'affichage des graphiques sans données Brevo.
// Structure identique au type EmailCampaign.
const MOCK_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'mock-1', name: 'Lancement produit Q1', subject: '🚀 Découvrez notre nouvelle offre',
    status: 'envoyée', sent_count: 3400, open_rate: 38.2, click_rate: 12.4,
    unsubscribe_count: 14, bounce_count: 22, conversion_count: 67,
    cost: 320, revenue_generated: 4800, roi: 1400,
    scheduled_at: undefined, sent_at: '2025-02-10T09:00:00Z',
    created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-10T12:00:00Z',
  },
  {
    id: 'mock-2', name: 'Newsletter Mars 2025', subject: 'Actualités du mois 📰',
    status: 'envoyée', sent_count: 5120, open_rate: 29.7, click_rate: 6.8,
    unsubscribe_count: 31, bounce_count: 48, conversion_count: 23,
    cost: 150, revenue_generated: 980, roi: 553,
    scheduled_at: undefined, sent_at: '2025-03-03T08:30:00Z',
    created_at: '2025-02-25T00:00:00Z', updated_at: '2025-03-03T10:00:00Z',
  },
  {
    id: 'mock-3', name: 'Relance prospects inactifs', subject: 'On a pensé à vous 💬',
    status: 'envoyée', sent_count: 1800, open_rate: 22.1, click_rate: 4.3,
    unsubscribe_count: 9, bounce_count: 11, conversion_count: 8,
    cost: 90, revenue_generated: 420, roi: 367,
    scheduled_at: undefined, sent_at: '2025-03-15T10:00:00Z',
    created_at: '2025-03-10T00:00:00Z', updated_at: '2025-03-15T13:00:00Z',
  },
  {
    id: 'mock-4', name: 'Promo Printemps', subject: '🌸 -20% pendant 48h seulement',
    status: 'planifiée', sent_count: 0, open_rate: undefined, click_rate: undefined,
    unsubscribe_count: 0, bounce_count: 0, conversion_count: 0,
    cost: 200, revenue_generated: 0, roi: null,
    scheduled_at: '2025-04-05T08:00:00Z', sent_at: undefined,
    created_at: '2025-03-28T00:00:00Z', updated_at: '2025-03-28T00:00:00Z',
  },
  {
    id: 'mock-5', name: 'Onboarding nouveaux contacts', subject: 'Bienvenue dans notre espace CRM 👋',
    status: 'brouillon', sent_count: 0, open_rate: undefined, click_rate: undefined,
    unsubscribe_count: 0, bounce_count: 0, conversion_count: 0,
    cost: 0, revenue_generated: 0, roi: null,
    scheduled_at: undefined, sent_at: undefined,
    created_at: '2025-03-30T00:00:00Z', updated_at: '2025-03-30T00:00:00Z',
  },
]

// ── Helpers ROI ───────────────────────────────────────────────

/**
 * Calcule le ROI à partir du coût et du chiffre d'affaires généré.
 * Formule : (revenue - cost) / cost × 100
 * Retourne null si le coût est absent ou nul (non renseigné).
 *
 * Utilisée en frontend pour affichage immédiat ; le backend
 * persiste la même valeur via email.service.calculateAndSaveRoi().
 */
export function calculateRoi(cost?: number | null, revenue?: number | null): number | null {
  const c = Number(cost   ?? 0)
  const r = Number(revenue ?? 0)
  if (c <= 0) return null          // coût non renseigné → ROI incalculable
  return Math.round(((r - c) / c) * 100 * 10) / 10
}

/** Formate un ROI numérique en chaîne affichable, ex: "+340%" ou "—". */
function formatRoi(roi: number | null | undefined): string {
  if (roi === null || roi === undefined) return '—'
  const sign = roi >= 0 ? '+' : ''
  return `${sign}${roi}%`
}

// ── Config statuts ────────────────────────────────────────────

const STATUS_CFG = {
  brouillon: { color: '#94a3b8', bg: '#f8fafc', label: 'Brouillon' },
  planifiée: { color: '#f59e0b', bg: '#fffbeb', label: 'Planifiée'  },
  envoyée:   { color: '#34d399', bg: '#f0fdf4', label: 'Envoyée'    },
} as const

// Couleurs des barres du graphique performances
const PERF_COLORS = {
  open:    '#60a5fa',  // bleu — taux d'ouverture
  click:   '#34d399',  // vert — taux de clic
  unsub:   '#f87171',  // rouge — désabonnements (‰ pour lisibilité)
  bounce:  '#fbbf24',  // ambre — bounces
}

// ── Sous-composants ───────────────────────────────────────────

/** Indicateur de tendance ROI avec icône colorée. */
function RoiBadge({ roi }: { roi: number | null | undefined }) {
  if (roi === null || roi === undefined) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const isPos  = roi >= 0
  const Icon   = roi === 0 ? Minus : isPos ? TrendingUp : TrendingDown
  const color  = roi === 0 ? 'text-gray-400' : isPos ? 'text-emerald-500' : 'text-red-400'
  const label  = formatRoi(roi)
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  )
}

/** Tooltip personnalisé pour le graphique de performances. */
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

/** Tooltip personnalisé pour le graphique ROI. */
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

// ── Composant principal ───────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [view, setView]           = useState<'table' | 'charts'>('table')

  // ── Chargement ──────────────────────────────────────────────
  const loadCampaigns = () => {
    setLoading(true)
    // Si USE_MOCK_DATA est activé, on court-circuite l'API
    if (USE_MOCK_DATA) {
      setCampaigns(MOCK_CAMPAIGNS)
      setLoading(false)
      return
    }
    api.get('/email/campaigns')
      .then((rows: EmailCampaign[]) => {
        // Recalcule le ROI côté frontend si le backend ne l'a pas encore persisté
        // (cas d'une campagne sans sync récent)
        const enriched = rows.map(c => ({
          ...c,
          roi: c.roi ?? calculateRoi(c.cost, c.revenue_generated),
        }))
        setCampaigns(enriched)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCampaigns() }, [])

  // ── Sync Brevo (admin) ──────────────────────────────────────
  // Déclenche PATCH /email/campaigns/:id/sync pour chaque campagne envoyée.
  // Le backend appelle ensuite emailService.syncCampaignStats() qui tire
  // les métriques agrégées depuis l'API Brevo.
  const handleSyncAll = async () => {
    if (USE_MOCK_DATA) return
    setSyncing(true)
    try {
      const sent = campaigns.filter(c => c.status === 'envoyée')
      await Promise.all(sent.map(c => api.patch(`/email/campaigns/${c.id}/sync`, {})))
      loadCampaigns()
    } finally {
      setSyncing(false)
    }
  }

  // ── Données graphiques ──────────────────────────────────────
  // Préparées en mémoire, uniquement sur les campagnes envoyées.

  /** Graphique performances : taux ouverture + clic par campagne. */
  const perfChartData = useMemo(() =>
    campaigns
      .filter(c => c.status === 'envoyée' && c.sent_count > 0)
      .map(c => ({
        name:  c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
        'Taux ouv.':  c.open_rate  ?? 0,
        'Taux clic':  c.click_rate ?? 0,
      })),
    [campaigns]
  )

  /** Graphique ROI : une barre par campagne avec coût renseigné. */
  const roiChartData = useMemo(() =>
    campaigns
      .filter(c => c.status === 'envoyée' && Number(c.cost ?? 0) > 0)
      .map(c => ({
        name: c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
        roi:  c.roi ?? calculateRoi(c.cost, c.revenue_generated) ?? 0,
      })),
    [campaigns]
  )

  /** KPIs agrégés affichés en haut de page. */
  const kpis = useMemo(() => {
    const sent = campaigns.filter(c => c.status === 'envoyée')
    const totalSent   = sent.reduce((s, c) => s + (c.sent_count ?? 0), 0)
    const avgOpen     = sent.length
      ? sent.reduce((s, c) => s + (c.open_rate ?? 0), 0) / sent.length
      : null
    const avgClick    = sent.length
      ? sent.reduce((s, c) => s + (c.click_rate ?? 0), 0) / sent.length
      : null
    const totalRevenue = sent.reduce((s, c) => s + Number(c.revenue_generated ?? 0), 0)
    return { totalSent, avgOpen, avgClick, totalRevenue, sentCount: sent.length }
  }, [campaigns])

  // ── Rendu ────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Campagnes email</h1>
          <p className="text-sm text-gray-500">
            Powered by Brevo
            {USE_MOCK_DATA && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-400 text-xs font-semibold">
                <AlertCircle className="w-3 h-3" />
                Données fictives (mock)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bascule tableau / graphiques */}
          <div className="flex border border-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'table'
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Tableau
            </button>
            <button
              onClick={() => setView('charts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'charts'
                  ? 'bg-gray-700 text-gray-100'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Graphiques
            </button>
          </div>

          {/* Sync Brevo — appelle PATCH /email/campaigns/:id/sync */}
          {!USE_MOCK_DATA && (
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-40 rounded"
            >
              {syncing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              Sync Brevo
            </button>
          )}

          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Emails envoyés',
            value: kpis.totalSent.toLocaleString('fr-FR'),
            sub:   `${kpis.sentCount} campagne${kpis.sentCount !== 1 ? 's' : ''}`,
            icon:  Mail,
            color: 'text-blue-400',
          },
          {
            label: 'Ouverture moy.',
            value: kpis.avgOpen !== null ? `${kpis.avgOpen.toFixed(1)}%` : '—',
            sub:   'Taux moyen toutes campagnes',
            icon:  BarChart2,
            color: 'text-violet-400',
          },
          {
            label: 'Clic moyen',
            value: kpis.avgClick !== null ? `${kpis.avgClick.toFixed(1)}%` : '—',
            sub:   'Taux moyen toutes campagnes',
            icon:  TrendingUp,
            color: 'text-emerald-400',
          },
          {
            label: 'CA généré',
            value: kpis.totalRevenue > 0
              ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(kpis.totalRevenue)
              : '—',
            sub:   'Revenus attribués aux campagnes',
            icon:  TrendingUp,
            color: 'text-amber-400',
          },
        ].map(card => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 mb-1.5">
                  {card.label}
                </p>
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
                    {[
                      'Campagne', 'Statut', 'Envois',
                      'Taux ouv.', 'Taux clic',
                      'Coût', 'CA généré', 'ROI',
                      'Planifiée le',
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map(c => {
                    const scfg = STATUS_CFG[c.status] ?? STATUS_CFG.brouillon
                    // Recalcule le ROI en live si le champ backend est absent
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
                          {Number(c.cost ?? 0) > 0
                            ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(c.cost))
                            : '—'
                          }
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">
                          {Number(c.revenue_generated ?? 0) > 0
                            ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(c.revenue_generated))
                            : '—'
                          }
                        </td>
                        <td className="px-4 py-3.5">
                          {/* RoiBadge utilise calculateRoi() pour l'affichage */}
                          <RoiBadge roi={roi} />
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {formatDate(c.scheduled_at ?? c.sent_at)}
                        </td>
                      </tr>
                    )
                  })}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400 text-sm">
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

              {/* Graphique 1 — Performances (ouverture + clic) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800">Performances d'engagement</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Taux d'ouverture et de clic par campagne envoyée
                  </p>
                </div>
                {perfChartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-xs text-gray-400">
                    Aucune campagne envoyée avec des données disponibles
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={perfChartData}
                      barSize={20}
                      margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <RechartsTooltip content={<PerfTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '8px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar dataKey="Taux ouv."  fill={PERF_COLORS.open}  radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Taux clic" fill={PERF_COLORS.click} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Graphique 2 — ROI par campagne */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800">ROI par campagne</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    (CA généré − coût) / coût × 100 — calculé via{' '}
                    <code className="text-[10px] bg-gray-100 px-1 rounded">calculateRoi()</code>
                  </p>
                </div>
                {roiChartData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-xs text-gray-400">
                    Renseignez le coût et le CA généré pour afficher le ROI
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={roiChartData}
                      barSize={28}
                      margin={{ top: 4, right: 4, left: -4, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                        tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
                      />
                      <RechartsTooltip content={<RoiTooltip />} />
                      <Bar dataKey="roi" label={false} radius={[3, 3, 0, 0]}>
                        {roiChartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.roi >= 0 ? '#34d399' : '#f87171'}
                            opacity={0.85}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Graphique 3 — Évolution temporelle (ouverture) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 xl:col-span-2">
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800">Évolution des performances dans le temps</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Taux d'ouverture et de clic au fil des campagnes envoyées
                  </p>
                </div>
                {perfChartData.length < 2 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-gray-400">
                    Au moins 2 campagnes envoyées nécessaires pour afficher la tendance
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart
                      data={perfChartData}
                      margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <RechartsTooltip content={<PerfTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '8px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Line
                        type="monotone"
                        dataKey="Taux ouv."
                        stroke={PERF_COLORS.open}
                        strokeWidth={2}
                        dot={{ fill: PERF_COLORS.open, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Taux clic"
                        stroke={PERF_COLORS.click}
                        strokeWidth={2}
                        dot={{ fill: PERF_COLORS.click, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          )}
        </>
      )}

      {/* Modal création */}
      {showModal && (
        <CampaignModal
          onClose={() => setShowModal(false)}
          onSaved={newCampaign => {
            setShowModal(false)
            setCampaigns(prev => [newCampaign, ...prev])  // ajout en tête de liste
          }}
        />
      )}
    </div>
  )
}
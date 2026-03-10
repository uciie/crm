'use client'
// ============================================================
// app/(dashboard)/companies/page.tsx
// MODIFIÉ : pagination locale limitée à 5 éléments par page
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter }     from 'next/navigation'
import {
  Building2, Search, Plus, MapPin, Users, TrendingUp,
  Pencil, Trash2, Loader2, Factory, BarChart3,
  DollarSign, ChevronDown, ArrowUpRight,
} from 'lucide-react'
import { companiesService } from '@/services/companies.service'
import { useToast }         from '@/hooks/useToast'
import { useAuth }          from '@/hooks/useAuth'
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton'
import { CompanyModal }     from '@/components/companies/CompanyModal'
import { Pagination }       from '@/components/ui/Pagination'          // ← nouveau
import { usePagination }    from '@/hooks/usePagination'               // ← nouveau
import { cn }               from '@/lib/utils'
import type { Company, Pagination as PaginationType } from '@/types/crm.types'

const PAGE_SIZE = 5   // ← limite globale

const INDUSTRY_OPTIONS = [
  'Technologie', 'Finance', 'Sante', 'Commerce de detail',
  'Industrie', 'Immobilier', 'Education', 'Conseil', 'Medias', 'Autre',
]

// ── Tooltip ───────────────────────────────────────────────────
function Tooltip({ label, children, position = 'top' }: {
  label: string; children: React.ReactNode; position?: 'top' | 'bottom'
}) {
  return (
    <div className="relative group/tip inline-flex">
      {children}
      <div className={[
        'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50',
        'opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 delay-100',
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
      ].join(' ')}>
        <div className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold tracking-[0.15em] uppercase px-2.5 py-1.5 whitespace-nowrap shadow-xl">
          {label}
        </div>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, loading }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; loading: boolean
}) {
  if (loading) return <StatCardSkeleton />
  return (
    <div className="bg-slate-900 border border-slate-800 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1.5 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 border border-slate-800 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      </div>
    </div>
  )
}

function CompanyLogo({ company }: { company: Company }) {
  if (company.logo_url) {
    return <img src={company.logo_url} alt={`Logo ${company.name}`} className="w-9 h-9 object-contain rounded" />
  }
  return (
    <div className="w-9 h-9 bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
      <span className="text-[11px] font-bold text-slate-400">{company.name[0]?.toUpperCase() ?? 'C'}</span>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────
export default function CompaniesPage() {
  const router = useRouter()
  const { toast }                 = useToast()
  const { isAdmin, isCommercial } = useAuth()

  // Toutes les entreprises chargées (sans pagination API)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading]           = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats]               = useState<{ total: number; new_this_month: number } | null>(null)

  const [search, setSearch]                 = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')
  const [showModal, setShowModal]           = useState(false)
  const [editCompany, setEditCompany]       = useState<Company | null>(null)
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  // ── Filtrage local ────────────────────────────────────────
  const filtered = allCompanies.filter(c => {
    const matchSearch   = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.domain ?? '').toLowerCase().includes(search.toLowerCase())
    const matchIndustry = !filterIndustry || c.industry === filterIndustry
    return matchSearch && matchIndustry
  })

  // ── Pagination client (5 par page) ───────────────────────
  const pagination = usePagination(filtered, PAGE_SIZE)

  // Reset page quand les filtres changent
  useEffect(() => { pagination.reset() }, [search, filterIndustry])

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      // On charge TOUTES les entreprises (jusqu'à 500) pour filtrage local
      const data = await companiesService.list({ limit: 500 })
      setAllCompanies(data.data)
    } catch {
      toast('error', 'Erreur de chargement', 'Impossible de récupérer les entreprises.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  useEffect(() => {
    companiesService.getStats()
      .then(s => setStats(s))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const handleDelete = async (company: Company) => {
    if (!confirm(`Supprimer ${company.name} ?`)) return
    setDeletingId(company.id)
    try {
      await companiesService.remove(company.id)
      toast('success', 'Entreprise supprimée', `${company.name} a été supprimée.`)
      fetchCompanies()
    } catch {
      toast('error', 'Erreur', 'La suppression a échoué.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaved = (_: Company) => {
    setShowModal(false)
    setEditCompany(null)
    fetchCompanies()
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* En-tête */}
      <div className="px-6 py-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-slate-800 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <div className="h-px w-6 bg-blue-500 mb-1.5" />
              <h1 className="text-base font-bold text-slate-100 tracking-wide">Entreprises</h1>
            </div>
          </div>
          {isCommercial && (
            <button
              onClick={() => { setEditCompany(null); setShowModal(true) }}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle entreprise
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="region" aria-label="Statistiques entreprises">
          <StatCard icon={Building2} label="Total entreprises" value={stats?.total ?? 0} loading={statsLoading} />
          <StatCard icon={TrendingUp} label="Ce mois-ci" value={stats?.new_this_month ?? 0} sub="Nouvelles entreprises" loading={statsLoading} />
          <StatCard icon={BarChart3} label="Affichees" value={pagination.total} sub="Selon les filtres actifs" loading={loading} />
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" aria-hidden="true" />
            <input
              type="search"
              placeholder="Rechercher par nom, domaine..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 transition-all rounded-none"
            />
          </div>
          <div className="relative min-w-48">
            <select
              value={filterIndustry}
              onChange={e => setFilterIndustry(e.target.value)}
              className="w-full px-3 py-2 pr-8 text-sm bg-slate-900 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 transition-all rounded-none appearance-none"
            >
              <option value="">Tous les secteurs</option>
              {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* Compteur + info pagination */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            {loading ? 'Chargement...' : `${filtered.length} entreprise${filtered.length !== 1 ? 's' : ''} — page ${pagination.page}/${pagination.totalPages}`}
          </span>
          {(search || filterIndustry) && (
            <button onClick={() => { setSearch(''); setFilterIndustry('') }} className="text-blue-500 hover:text-blue-300 transition-colors">
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Tableau */}
        <div className="bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-950/60 border-b border-slate-800">
                <tr>
                  {['Entreprise', 'Secteur', 'Taille', 'Localisation', 'Contacts', 'CA Annuel', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-left">
                      {h && <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">{h}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <TableSkeleton rows={PAGE_SIZE} cols={7} />
                ) : pagination.pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-600 text-sm">
                      Aucune entreprise trouvée
                    </td>
                  </tr>
                ) : (
                  pagination.pageItems.map(company => (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/companies/${company.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <CompanyLogo company={company} />
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{company.name}</p>
                            {company.domain && <p className="text-xs text-slate-600 mt-0.5">{company.domain}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {company.industry
                          ? <div className="flex items-center gap-1.5"><Factory className="w-3 h-3 text-slate-700 shrink-0" /><span className="text-sm text-slate-400">{company.industry}</span></div>
                          : <span className="text-slate-700 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {company.size
                          ? <span className="text-[10px] font-bold px-2 py-1 border border-slate-700 text-slate-400 bg-slate-800/40">{company.size}</span>
                          : <span className="text-slate-700 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {company.city
                          ? <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-700 shrink-0" /><span className="text-sm text-slate-400">{company.city}{company.country ? `, ${company.country}` : ''}</span></div>
                          : <span className="text-slate-700 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-slate-700" />
                          <span className="text-sm text-slate-400 tabular-nums">{company.contacts_count ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {company.annual_revenue
                          ? <span className="text-sm font-medium text-slate-300 tabular-nums">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(company.annual_revenue))}</span>
                          : <span className="text-slate-700 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip label="Ouvrir">
                            <button onClick={() => router.push(`/companies/${company.id}`)} className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          {isCommercial && (
                            <Tooltip label="Modifier">
                              <button onClick={() => { setEditCompany(company); setShowModal(true) }} className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </Tooltip>
                          )}
                          {isAdmin && (
                            <Tooltip label="Supprimer">
                              <button onClick={() => handleDelete(company)} disabled={deletingId === company.id} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-all disabled:opacity-40">
                                {deletingId === company.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

        {/* ── Pagination ── */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={filtered.length}
          limit={PAGE_SIZE}
          onPrev={pagination.prevPage}
          onNext={pagination.nextPage}
          onPage={pagination.setPage}
          entityLabel="entreprises"
        />
      </div>

      {showModal && (
        <CompanyModal
          company={editCompany}
          onClose={() => { setShowModal(false); setEditCompany(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
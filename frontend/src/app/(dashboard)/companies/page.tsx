'use client'
// ============================================================
// app/(dashboard)/companies/page.tsx
// Module de gestion des entreprises
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter }     from 'next/navigation'
import { useForm }       from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { z }             from 'zod'
import {
  Building2,
  Search,
  Plus,
  Globe,
  Phone,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Loader2,
  Factory,
  BarChart3,
} from 'lucide-react'
import { companiesService } from '@/services/companies.service'
import { useToast }         from '@/hooks/useToast'
import { useAuth }          from '@/hooks/useAuth'
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton'
import { cn }               from '@/lib/utils'
import type {
  Company,
  CompanySize,
  Pagination,
  CreateCompanyPayload,
} from '@/types/crm.types'

// ── Schéma Zod ────────────────────────────────────────────────

const companySchema = z.object({
  name:            z.string().min(1, 'Le nom est obligatoire').max(255),
  domain:          z.string().optional(),
  industry:        z.string().optional(),
  size:            z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional().or(z.literal('')),
  website:         z.string().url('URL invalide').optional().or(z.literal('')),
  phone:           z.string().optional(),
  city:            z.string().optional(),
  country:         z.string().optional(),
  annual_revenue:  z.coerce.number().min(0).optional().or(z.literal('')),
  notes:           z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

// ── Constantes ────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  'Technologie', 'Finance', 'Santé', 'Commerce de détail',
  'Industrie', 'Immobilier', 'Éducation', 'Conseil', 'Médias', 'Autre',
]

const SIZE_LABELS: Record<CompanySize, string> = {
  '1-10':    'TPE — 1 à 10',
  '11-50':   'PME — 11 à 50',
  '51-200':  'ETI — 51 à 200',
  '201-500': 'Grande — 201 à 500',
  '500+':    'Très grande — 500+',
}

// ── Sous-composant champ formulaire ───────────────────────────

interface FieldProps {
  label: string
  error?: string
  children: React.ReactNode
  icon?: React.ElementType
  required?: boolean
}

function Field({ label, error, children, icon: Icon, required }: FieldProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-red-400 inline-block shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ── Sous-composant stat card ──────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon:    React.ElementType
  label:   string
  value:   string | number
  sub?:    string
  loading: boolean
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

// ── Logo entreprise ───────────────────────────────────────────

function CompanyLogo({ company }: { company: Company }) {
  if (company.logo_url) {
    return (
      <img
        src={company.logo_url}
        alt={company.name}
        className="w-9 h-9 object-contain rounded"
      />
    )
  }
  return (
    <div className="w-9 h-9 bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
      <span className="text-[11px] font-bold text-slate-400">
        {company.name[0]?.toUpperCase() ?? 'C'}
      </span>
    </div>
  )
}

// ── Modal formulaire entreprise ───────────────────────────────

interface CompanyModalProps {
  company?: Company | null
  onClose:  () => void
  onSaved:  (c: Company) => void
}

function CompanyModal({ company, onClose, onSaved }: CompanyModalProps) {
  const { toast } = useToast()
  const isEdit    = !!company?.id

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name:           company?.name           ?? '',
      domain:         company?.domain         ?? '',
      industry:       company?.industry       ?? '',
      size:           (company?.size as CompanySize) ?? '',
      website:        company?.website        ?? '',
      phone:          company?.phone          ?? '',
      city:           company?.city           ?? '',
      country:        company?.country        ?? '',
      annual_revenue: company?.annual_revenue as number | undefined ?? '',
      notes:          company?.notes          ?? '',
    },
  })

  const onSubmit = async (data: CompanyFormData) => {
    try {
      const payload: CreateCompanyPayload = {
        name:            data.name,
        domain:          data.domain          || undefined,
        industry:        data.industry        || undefined,
        size:            (data.size as CompanySize) || undefined,
        website:         data.website         || undefined,
        phone:           data.phone           || undefined,
        city:            data.city            || undefined,
        country:         data.country         || undefined,
        annual_revenue:  data.annual_revenue  ? Number(data.annual_revenue) : undefined,
        notes:           data.notes           || undefined,
      }

      let saved: Company
      if (isEdit && company) {
        saved = await companiesService.update(company.id, payload)
        toast('success', 'Entreprise modifiée', `${saved.name} a été mis à jour.`)
      } else {
        saved = await companiesService.create(payload)
        toast('success', 'Entreprise créée', `${saved.name} a été ajoutée.`)
      }
      onSaved(saved)
    } catch (err: any) {
      toast('error', 'Erreur', err?.message ?? 'Une erreur est survenue.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-950 border border-slate-800 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="h-px w-8 bg-blue-500 mb-2" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">
              {isEdit ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-900 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-5"
        >
          {/* Identité */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">Identité</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nom" error={errors.name?.message} icon={Building2} required>
                <input
                  {...register('name')}
                  autoFocus
                  placeholder="Acme Corp"
                  className={cn(
                    'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200',
                    'placeholder:text-slate-700 outline-none transition-all rounded-none',
                    errors.name
                      ? 'border-red-500/60'
                      : 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
                  )}
                />
              </Field>
              <Field label="Domaine" icon={Globe}>
                <input
                  {...register('domain')}
                  placeholder="acme.com"
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                />
              </Field>
            </div>
          </section>

          {/* Classification */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">Classification</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Secteur" icon={Factory}>
                <select
                  {...register('industry')}
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                >
                  <option value="">— Choisir —</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Taille" icon={Users}>
                <select
                  {...register('size')}
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                >
                  <option value="">— Choisir —</option>
                  {Object.entries(SIZE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Contact */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Site web" error={errors.website?.message} icon={Globe}>
                <input
                  {...register('website')}
                  type="url"
                  placeholder="https://acme.com"
                  className={cn(
                    'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200',
                    'placeholder:text-slate-700 outline-none transition-all rounded-none',
                    errors.website
                      ? 'border-red-500/60'
                      : 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
                  )}
                />
              </Field>
              <Field label="Téléphone" icon={Phone}>
                <input
                  {...register('phone')}
                  placeholder="+33 1 00 00 00 00"
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                />
              </Field>
              <Field label="Ville" icon={MapPin}>
                <input
                  {...register('city')}
                  placeholder="Paris"
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                />
              </Field>
              <Field label="Pays">
                <input
                  {...register('country')}
                  placeholder="France"
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                />
              </Field>
            </div>
          </section>

          {/* Financier */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">Données financières</p>
            <Field label="Chiffre d'affaires annuel (€)" icon={DollarSign}>
              <input
                {...register('annual_revenue')}
                type="number"
                min="0"
                placeholder="5000000"
                className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
              />
            </Field>
          </section>

          {/* Notes */}
          <section>
            <Field label="Notes">
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Informations complémentaires..."
                className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none resize-none"
              />
            </Field>
          </section>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-slate-500 border border-slate-800 hover:border-slate-600 hover:text-slate-300 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer l\'entreprise'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

export default function CompaniesPage() {
  const router = useRouter()
  const { toast }                 = useToast()
  const { isAdmin, isCommercial } = useAuth()

  const [companies, setCompanies]     = useState<Company[]>([])
  const [pagination, setPagination]   = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading]         = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats]             = useState<{ total: number; new_this_month: number } | null>(null)
  const [search, setSearch]           = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')
  const [page, setPage]               = useState(1)
  const [showModal, setShowModal]     = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await companiesService.list({
        search:   search || undefined,
        industry: filterIndustry || undefined,
        page,
        limit:    20,
      })
      setCompanies(data.data)
      setPagination(data.pagination)
    } catch {
      toast('error', 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [search, filterIndustry, page, toast])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  useEffect(() => {
    companiesService.getStats()
      .then(s => setStats(s))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const handleDelete = async (company: Company) => {
    if (!confirm(`Supprimer ${company.name} ? Les contacts associés seront désassociés.`)) return
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
      {/* ── En-tête ── */}
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
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            icon={Building2}
            label="Total entreprises"
            value={stats?.total ?? 0}
            loading={statsLoading}
          />
          <StatCard
            icon={TrendingUp}
            label="Ce mois-ci"
            value={stats?.new_this_month ?? 0}
            sub="Nouvelles entreprises"
            loading={statsLoading}
          />
          <StatCard
            icon={BarChart3}
            label="Affichées"
            value={pagination.total}
            sub="Selon les filtres"
            loading={loading}
          />
        </div>

        {/* ── Filtres ── */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Rechercher par nom, domaine..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 transition-all rounded-none"
            />
          </div>
          <select
            value={filterIndustry}
            onChange={e => { setFilterIndustry(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm bg-slate-900 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 transition-all rounded-none min-w-48"
          >
            <option value="">Tous les secteurs</option>
            {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* ── Tableau ── */}
        <div className="bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-950/60 border-b border-slate-800">
                <tr>
                  {['Entreprise', 'Secteur', 'Taille', 'Localisation', 'Contacts', 'CA Annuel', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left">
                      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <TableSkeleton rows={8} cols={7} />
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-600 text-sm">
                      Aucune entreprise trouvée
                    </td>
                  </tr>
                ) : (
                  companies.map(company => (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/companies/${company.id}`)}
                    >
                      {/* Nom */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <CompanyLogo company={company} />
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{company.name}</p>
                            {company.domain && (
                              <p className="text-xs text-slate-600 mt-0.5">{company.domain}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Secteur */}
                      <td className="px-5 py-3.5">
                        {company.industry ? (
                          <div className="flex items-center gap-1.5">
                            <Factory className="w-3 h-3 text-slate-700 shrink-0" />
                            <span className="text-sm text-slate-400">{company.industry}</span>
                          </div>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>

                      {/* Taille */}
                      <td className="px-5 py-3.5">
                        {company.size ? (
                          <span className="text-[10px] font-bold px-2 py-1 border border-slate-700 text-slate-400 bg-slate-800/40">
                            {company.size}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>

                      {/* Localisation */}
                      <td className="px-5 py-3.5">
                        {company.city ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-700 shrink-0" />
                            <span className="text-sm text-slate-400">
                              {company.city}{company.country ? `, ${company.country}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>

                      {/* Contacts */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-slate-700" />
                          <span className="text-sm text-slate-400 tabular-nums">
                            {company.contacts_count ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* CA */}
                      <td className="px-5 py-3.5">
                        {company.annual_revenue ? (
                          <span className="text-sm font-medium text-slate-300 tabular-nums">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                            }).format(Number(company.annual_revenue))}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isCommercial && (
                            <button
                              onClick={() => { setEditCompany(company); setShowModal(true) }}
                              className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all"
                              aria-label="Modifier"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(company)}
                              disabled={deletingId === company.id}
                              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-all disabled:opacity-40"
                              aria-label="Supprimer"
                            >
                              {deletingId === company.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </button>
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
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Page {pagination.page} / {pagination.totalPages} — {pagination.total} entreprise{pagination.total !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal formulaire ── */}
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
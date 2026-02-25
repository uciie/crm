'use client'
// ============================================================
// app/(dashboard)/companies/page.tsx
// Module de gestion des entreprises
// Corrections : icones Lucide uniquement, zero emoji,
//               listage dynamique via companiesService,
//               formulaire Zod + React Hook Form
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
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Loader2,
  Factory,
  BarChart3,
  DollarSign,
  ChevronDown,
  AlertCircle,
  ArrowUpRight,
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

// ── Schema Zod -- miroir du CreateCompanyDto backend ──────────
// Backend valide : name (string, max 255), domain (optional, string),
//   industry (optional), size (enum), website (optional, string),
//   annual_revenue (optional, IsDecimal)

const companySchema = z.object({
  name:           z.string().min(1, 'Le nom est obligatoire').max(255),
  domain:         z.string().optional(),
  industry:       z.string().optional(),
  size:           z
    .enum(['1-10', '11-50', '51-200', '201-500', '500+'])
    .optional()
    .or(z.literal('')),
  website:        z
    .string()
    .url('URL invalide (ex: https://exemple.com)')
    .optional()
    .or(z.literal('')),
  phone:          z.string().optional(),
  city:           z.string().optional(),
  country:        z.string().optional(),
  annual_revenue: z.coerce.number().min(0).optional().or(z.literal('')),
  notes:          z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

// ── Constantes ────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  'Technologie', 'Finance', 'Sante', 'Commerce de detail',
  'Industrie', 'Immobilier', 'Education', 'Conseil', 'Medias', 'Autre',
]

const SIZE_LABELS: Record<CompanySize, string> = {
  '1-10':    'TPE — 1 a 10',
  '11-50':   'PME — 11 a 50',
  '51-200':  'ETI — 51 a 200',
  '201-500': 'Grande — 201 a 500',
  '500+':    'Tres grande — 500+',
}

// ── Sous-composant champ formulaire ───────────────────────────

interface FieldProps {
  label:    string
  error?:   string
  children: React.ReactNode
  icon?:    React.ElementType
  required?: boolean
  htmlFor?: string
}

function Field({ label, error, children, icon: Icon, required, htmlFor }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5"
      >
        {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-label="obligatoire">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────

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
          <Icon className="w-4 h-4 text-slate-600" aria-hidden="true" />
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
        alt={`Logo ${company.name}`}
        className="w-9 h-9 object-contain rounded"
      />
    )
  }
  return (
    <div
      className="w-9 h-9 bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <span className="text-[11px] font-bold text-slate-400">
        {company.name[0]?.toUpperCase() ?? 'C'}
      </span>
    </div>
  )
}

// ── Styles communs ────────────────────────────────────────────

const inputBase =
  'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200 ' +
  'placeholder:text-slate-700 outline-none transition-all rounded-none'

const inputNormal = inputBase + ' border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
const inputErr    = inputBase + ' border-red-500/60 focus:border-red-400'
const inputClass  = (err?: string) => err ? inputErr : inputNormal

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
      annual_revenue: company?.annual_revenue !== undefined
        ? Number(company.annual_revenue)
        : '',
      notes:          company?.notes ?? '',
    },
  })

  const onSubmit = async (data: CompanyFormData) => {
    try {
      const payload: CreateCompanyPayload = {
        name:           data.name,
        domain:         data.domain          || undefined,
        industry:       data.industry        || undefined,
        size:           (data.size as CompanySize) || undefined,
        website:        data.website         || undefined,
        phone:          data.phone           || undefined,
        city:           data.city            || undefined,
        country:        data.country         || undefined,
        annual_revenue: data.annual_revenue  ? Number(data.annual_revenue) : undefined,
        notes:          data.notes           || undefined,
      }

      let saved: Company
      if (isEdit && company) {
        saved = await companiesService.update(company.id, payload)
        toast('success', 'Entreprise modifiee', `${saved.name} a ete mis a jour.`)
      } else {
        saved = await companiesService.create(payload)
        toast('success', 'Entreprise creee', `${saved.name} a ete ajoutee.`)
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
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Modifier l'entreprise" : 'Nouvelle entreprise'}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-950 border border-slate-800 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60">

        {/* En-tete */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="h-px w-8 bg-blue-500 mb-2" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">
              {isEdit ? "Modifier l'entreprise" : 'Nouvelle entreprise'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-900 transition-all"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire */}
        <form
          id="company-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-5"
          noValidate
        >
          {/* Identite */}
          <section aria-labelledby="sec-identite">
            <p id="sec-identite" className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Identite
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom" error={errors.name?.message} icon={Building2} required htmlFor="co-name">
                <input
                  id="co-name"
                  {...register('name')}
                  autoFocus
                  placeholder="Acme Corp"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  className={inputClass(errors.name?.message)}
                />
              </Field>
              <Field label="Domaine" icon={Globe} htmlFor="co-domain">
                <input
                  id="co-domain"
                  {...register('domain')}
                  placeholder="acme.com"
                  className={inputNormal}
                />
              </Field>
            </div>
          </section>

          {/* Classification */}
          <section aria-labelledby="sec-classif">
            <p id="sec-classif" className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Classification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Secteur */}
              <Field label="Secteur" icon={Factory} htmlFor="co-industry">
                <div className="relative">
                  <select
                    id="co-industry"
                    {...register('industry')}
                    className={cn(inputNormal, 'appearance-none pr-8')}
                  >
                    <option value="">Choisir un secteur</option>
                    {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </Field>

              {/* Taille */}
              <Field label="Taille" icon={Users} htmlFor="co-size">
                <div className="relative">
                  <select
                    id="co-size"
                    {...register('size')}
                    className={cn(inputNormal, 'appearance-none pr-8')}
                  >
                    <option value="">Choisir une taille</option>
                    {Object.entries(SIZE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* Contact */}
          <section aria-labelledby="sec-contact">
            <p id="sec-contact" className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Contact
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Site web" error={errors.website?.message} icon={Globe} htmlFor="co-website">
                <input
                  id="co-website"
                  {...register('website')}
                  type="url"
                  placeholder="https://acme.com"
                  aria-invalid={!!errors.website}
                  className={inputClass(errors.website?.message)}
                />
              </Field>
              <Field label="Telephone" icon={Phone} htmlFor="co-phone">
                <input
                  id="co-phone"
                  {...register('phone')}
                  type="tel"
                  placeholder="+33 1 00 00 00 00"
                  className={inputNormal}
                />
              </Field>
              <Field label="Ville" icon={MapPin} htmlFor="co-city">
                <input
                  id="co-city"
                  {...register('city')}
                  placeholder="Paris"
                  autoComplete="address-level2"
                  className={inputNormal}
                />
              </Field>
              <Field label="Pays" htmlFor="co-country">
                <input
                  id="co-country"
                  {...register('country')}
                  placeholder="France"
                  autoComplete="country-name"
                  className={inputNormal}
                />
              </Field>
            </div>
          </section>

          {/* Finances */}
          <section aria-labelledby="sec-finances">
            <p id="sec-finances" className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Donnees financieres
            </p>
            <Field
              label="Chiffre d'affaires annuel (€)"
              error={errors.annual_revenue?.message}
              icon={DollarSign}
              htmlFor="co-revenue"
            >
              <input
                id="co-revenue"
                {...register('annual_revenue')}
                type="number"
                min="0"
                placeholder="5000000"
                aria-invalid={!!errors.annual_revenue}
                className={inputClass(errors.annual_revenue?.message)}
              />
            </Field>
          </section>

          {/* Notes */}
          <section aria-labelledby="sec-notes">
            <p id="sec-notes" className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Notes
            </p>
            <Field label="Informations complementaires" htmlFor="co-notes">
              <textarea
                id="co-notes"
                {...register('notes')}
                rows={3}
                placeholder="Partenaire strategique, conditions speciales..."
                className={cn(inputNormal, 'resize-none')}
              />
            </Field>
          </section>
        </form>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-slate-500 border border-slate-800 hover:border-slate-600 hover:text-slate-300 transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="company-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {isSubmitting
              ? 'Enregistrement...'
              : isEdit ? "Modifier l'entreprise" : "Creer l'entreprise"
            }
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

  // Donnees
  const [companies, setCompanies]       = useState<Company[]>([])
  const [pagination, setPagination]     = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 1,
  })
  const [loading, setLoading]           = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats]               = useState<{
    total: number; new_this_month: number
  } | null>(null)

  // Filtres
  const [search, setSearch]               = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')
  const [page, setPage]                   = useState(1)

  // UI
  const [showModal, setShowModal]   = useState(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Chargement liste dynamique depuis GET /companies
  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await companiesService.list({
        search:   search   || undefined,
        industry: filterIndustry || undefined,
        page,
        limit:    20,
      })
      setCompanies(data.data)
      setPagination(data.pagination)
    } catch {
      toast('error', 'Erreur de chargement', 'Impossible de recuperer les entreprises.')
    } finally {
      setLoading(false)
    }
  }, [search, filterIndustry, page, toast])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  // Stats via GET /companies/stats
  useEffect(() => {
    companiesService.getStats()
      .then(s => setStats(s))
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const handleDelete = async (company: Company) => {
    if (!confirm(`Supprimer ${company.name} ? Les contacts associes seront desassocies.`)) return
    setDeletingId(company.id)
    try {
      await companiesService.remove(company.id)
      toast('success', 'Entreprise supprimee', `${company.name} a ete supprimee.`)
      fetchCompanies()
    } catch {
      toast('error', 'Erreur', 'La suppression a echoue.')
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

      {/* En-tete */}
      <div className="px-6 py-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-slate-800 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
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
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Nouvelle entreprise
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="region" aria-label="Statistiques entreprises">
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
            label="Affichees"
            value={pagination.total}
            sub="Selon les filtres actifs"
            loading={loading}
          />
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Rechercher par nom, domaine..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              aria-label="Rechercher une entreprise"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 transition-all rounded-none"
            />
          </div>
          <div className="relative min-w-48">
            <select
              value={filterIndustry}
              onChange={e => { setFilterIndustry(e.target.value); setPage(1) }}
              aria-label="Filtrer par secteur"
              className="w-full px-3 py-2 pr-8 text-sm bg-slate-900 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 transition-all rounded-none appearance-none"
            >
              <option value="">Tous les secteurs</option>
              {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Liste des entreprises">
              <thead className="bg-slate-950/60 border-b border-slate-800">
                <tr>
                  {[
                    { label: 'Entreprise', icon: Building2 },
                    { label: 'Secteur',    icon: Factory    },
                    { label: 'Taille',     icon: Users      },
                    { label: 'Localisation', icon: MapPin  },
                    { label: 'Contacts',   icon: Users      },
                    { label: 'CA Annuel',  icon: DollarSign },
                    { label: '',           icon: null       },
                  ].map((h, i) => (
                    <th key={i} scope="col" className="px-5 py-3.5 text-left">
                      {h.label && (
                        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">
                          {h.label}
                        </span>
                      )}
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
                      Aucune entreprise trouvee
                      {(search || filterIndustry) && (
                        <button
                          onClick={() => { setSearch(''); setFilterIndustry(''); setPage(1) }}
                          className="ml-2 text-blue-500 hover:text-blue-300 transition-colors underline underline-offset-2"
                        >
                          Reinitialiser les filtres
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  companies.map(company => (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/companies/${company.id}`)}
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && router.push(`/companies/${company.id}`)}
                      aria-label={`Voir les details de ${company.name}`}
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
                            <Factory className="w-3 h-3 text-slate-700 shrink-0" aria-hidden="true" />
                            <span className="text-sm text-slate-400">{company.industry}</span>
                          </div>
                        ) : (
                          <span className="text-slate-700 text-sm" aria-label="Non renseigne">—</span>
                        )}
                      </td>

                      {/* Taille */}
                      <td className="px-5 py-3.5">
                        {company.size ? (
                          <span className="text-[10px] font-bold px-2 py-1 border border-slate-700 text-slate-400 bg-slate-800/40">
                            {company.size}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm" aria-label="Non renseigne">—</span>
                        )}
                      </td>

                      {/* Localisation */}
                      <td className="px-5 py-3.5">
                        {company.city ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-700 shrink-0" aria-hidden="true" />
                            <span className="text-sm text-slate-400">
                              {company.city}{company.country ? `, ${company.country}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-700 text-sm" aria-label="Non renseigne">—</span>
                        )}
                      </td>

                      {/* Contacts */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-slate-700" aria-hidden="true" />
                          <span className="text-sm text-slate-400 tabular-nums">
                            {company.contacts_count ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* CA Annuel */}
                      <td className="px-5 py-3.5">
                        {company.annual_revenue ? (
                          <span className="text-sm font-medium text-slate-300 tabular-nums">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                            }).format(Number(company.annual_revenue))}
                          </span>
                        ) : (
                          <span className="text-slate-700 text-sm" aria-label="Non renseigne">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          {/* Lien vers detail */}
                          <button
                            onClick={() => router.push(`/companies/${company.id}`)}
                            className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all"
                            aria-label={`Ouvrir ${company.name}`}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {isCommercial && (
                            <button
                              onClick={() => { setEditCompany(company); setShowModal(true) }}
                              className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all"
                              aria-label={`Modifier ${company.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(company)}
                              disabled={deletingId === company.id}
                              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-all disabled:opacity-40"
                              aria-label={`Supprimer ${company.name}`}
                            >
                              {deletingId === company.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
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

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <nav
            className="flex items-center justify-between"
            aria-label="Pagination"
          >
            <p className="text-xs text-slate-600">
              Page {pagination.page} / {pagination.totalPages} — {pagination.total}{' '}
              entreprise{pagination.total !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}
                aria-label="Page precedente"
                className="p-2 border border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                aria-label="Page suivante"
                className="p-2 border border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* Modal formulaire */}
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
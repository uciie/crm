'use client'
// ============================================================
// components/companies/CompanyModal.tsx
// Modal création / édition d'une entreprise
// ============================================================

import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  Factory,
  DollarSign,
  ChevronDown,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import { companiesService } from '@/services/companies.service'
import { useToast }         from '@/hooks/useToast'
import { cn }               from '@/lib/utils'
import type { Company, CompanySize, CreateCompanyPayload } from '@/types/crm.types'

// ── Schema Zod ────────────────────────────────────────────────

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

// ── Styles communs ────────────────────────────────────────────

const inputBase =
  'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200 ' +
  'placeholder:text-slate-700 outline-none transition-all rounded-none'

const inputNormal = inputBase + ' border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
const inputErr    = inputBase + ' border-red-500/60 focus:border-red-400'
const inputClass  = (err?: string) => err ? inputErr : inputNormal

// ── Sous-composant Field ──────────────────────────────────────

interface FieldProps {
  label:     string
  error?:    string
  children:  React.ReactNode
  icon?:     React.ElementType
  required?: boolean
  htmlFor?:  string
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

// ── Props ─────────────────────────────────────────────────────

export interface CompanyModalProps {
  company?: Company | null
  onClose:  () => void
  onSaved:  (c: Company) => void
}

// ── Composant ─────────────────────────────────────────────────

export function CompanyModal({ company, onClose, onSaved }: CompanyModalProps) {
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
      notes:          company?.notes          ?? '',
    },
  })

  const onSubmit = async (data: CompanyFormData) => {
    try {
      const payload: CreateCompanyPayload = {
        name:           data.name,
        domain:         data.domain         || undefined,
        industry:       data.industry       || undefined,
        size:           (data.size as CompanySize) || undefined,
        website:        data.website        || undefined,
        phone:          data.phone          || undefined,
        city:           data.city           || undefined,
        country:        data.country        || undefined,
        annual_revenue: data.annual_revenue ? Number(data.annual_revenue) : undefined,
        notes:          data.notes          || undefined,
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
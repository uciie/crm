'use client'
// ============================================================
// components/contacts/ContactForm.tsx
// Formulaire creation/edition -- React Hook Form + Zod
// Corrections : icones Lucide uniquement, dropdown entreprise
//               synchronise avec companiesService, accessibilite ARIA
// ============================================================

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { z }                   from 'zod'
import {
  X,
  User,
  Mail,
  Phone,
  Smartphone,
  Briefcase,
  Building2,
  MapPin,
  Linkedin,
  FileText,
  Bell,
  BellOff,
  Loader2,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { contactsService }  from '@/services/contacts.service'
import { companiesService } from '@/services/companies.service'
import { useToast }         from '@/hooks/useToast'
import { cn }               from '@/lib/utils'
import type { Contact, CompanyOption } from '@/types/crm.types'

// ── Schema Zod -- miroir exact du DTO backend ─────────────────
// Backend : CreateContactDto
//   first_name  : string, notEmpty, max 100     <- OBLIGATOIRE
//   last_name   : string, notEmpty, max 100     <- OBLIGATOIRE
//   email       : optional, IsEmail             <- UNIQUE en base
//   company_id  : optional, IsUUID('4')         <- FK companies.id
//   assigned_to : optional, IsUUID('4')
//   is_subscribed: optional, boolean

const contactSchema = z.object({
  first_name:    z.string().min(1, 'Le prenom est obligatoire').max(100),
  last_name:     z.string().min(1, 'Le nom est obligatoire').max(100),
  email:         z.string().email("Format d'email invalide").optional().or(z.literal('')),
  phone:         z.string().optional(),
  mobile:        z.string().optional(),
  job_title:     z.string().optional(),
  department:    z.string().optional(),
  // UUID v4 valide ou chaine vide (=> undefined avant envoi)
  company_id:    z
    .string()
    .uuid('Selectionnez une entreprise valide')
    .optional()
    .or(z.literal('')),
  linkedin_url:  z.string().url('URL LinkedIn invalide').optional().or(z.literal('')),
  city:          z.string().optional(),
  country:       z.string().optional(),
  is_subscribed: z.boolean().default(true),
  notes:         z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

// ── Props ─────────────────────────────────────────────────────

interface ContactFormProps {
  contact?: Contact | null
  onClose:  () => void
  onSaved:  (contact: Contact) => void
}

// ── Sous-composant champ ──────────────────────────────────────

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
        <p
          role="alert"
          className="mt-1 text-[11px] text-red-400 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

// ── Styles communs input ──────────────────────────────────────

const inputBase =
  'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200 ' +
  'placeholder:text-slate-700 outline-none transition-all rounded-none'

const inputNormal =
  inputBase + ' border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'

const inputError =
  inputBase + ' border-red-500/60 focus:border-red-400'

function inputCn(hasError?: string) {
  return hasError ? inputError : inputNormal
}

// ── Composant principal ───────────────────────────────────────

export function ContactForm({ contact, onClose, onSaved }: ContactFormProps) {
  const { toast }                       = useToast()
  const isEdit                          = !!contact?.id
  const [companies, setCompanies]       = useState<CompanyOption[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name:    '',
      last_name:     '',
      email:         '',
      phone:         '',
      mobile:        '',
      job_title:     '',
      department:    '',
      company_id:    '',
      linkedin_url:  '',
      city:          '',
      country:       '',
      is_subscribed: true,
      notes:         '',
    },
  })

  // Pré-remplissage en mode edition
  useEffect(() => {
    if (contact) {
      reset({
        first_name:    contact.first_name    ?? '',
        last_name:     contact.last_name     ?? '',
        email:         contact.email         ?? '',
        phone:         contact.phone         ?? '',
        mobile:        contact.mobile        ?? '',
        job_title:     contact.job_title     ?? '',
        department:    contact.department    ?? '',
        company_id:    contact.company_id    ?? '',
        linkedin_url:  contact.linkedin_url  ?? '',
        city:          contact.city          ?? '',
        country:       contact.country       ?? '',
        is_subscribed: contact.is_subscribed ?? true,
        notes:         contact.notes         ?? '',
      })
    }
  }, [contact, reset])

  // Chargement dynamique des entreprises depuis l'API
  // GET /companies?limit=500 => CompanyOption[]
  useEffect(() => {
    setLoadingCompanies(true)
    companiesService
      .listOptions()           // renvoie { id, name }[]
      .then(setCompanies)
      .catch(() => {
        toast('error', 'Erreur', 'Impossible de charger la liste des entreprises.')
      })
      .finally(() => setLoadingCompanies(false))
  }, [])

  // Nettoyage payload avant envoi -- transforme '' en undefined
  const buildPayload = (data: ContactFormData) => ({
    first_name:    data.first_name,
    last_name:     data.last_name,
    email:         data.email        || undefined,
    phone:         data.phone        || undefined,
    mobile:        data.mobile       || undefined,
    job_title:     data.job_title    || undefined,
    department:    data.department   || undefined,
    // company_id : UUID valide ou undefined (jamais '' envoyé au backend)
    company_id:    data.company_id   || undefined,
    linkedin_url:  data.linkedin_url || undefined,
    city:          data.city         || undefined,
    country:       data.country      || undefined,
    is_subscribed: data.is_subscribed,
    notes:         data.notes        || undefined,
  })

  const onSubmit = async (data: ContactFormData) => {
    try {
      const payload = buildPayload(data)

      let saved: Contact
      if (isEdit && contact) {
        saved = await contactsService.update(contact.id, payload)
        toast('success', 'Contact modifie', `${saved.first_name} ${saved.last_name} a ete mis a jour.`)
      } else {
        saved = await contactsService.create(payload)
        toast('success', 'Contact cree', `${saved.first_name} ${saved.last_name} a ete ajoute.`)
      }
      onSaved(saved)
    } catch (err: any) {
      const msg = err?.message ?? 'Une erreur est survenue.'
      toast('error', 'Erreur', msg.includes('{') ? 'Donnees invalides, verifiez le formulaire.' : msg)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier le contact' : 'Nouveau contact'}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-950 border border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60">

        {/* En-tete */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="h-px w-8 bg-blue-500 mb-2" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">
              {isEdit ? 'Modifier le contact' : 'Nouveau contact'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-900 transition-all"
            aria-label="Fermer le formulaire"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps */}
        <form
          id="contact-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-5"
          noValidate
        >

          {/* -- IDENTITE -- */}
          <section aria-labelledby="section-identite">
            <p
              id="section-identite"
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3"
            >
              Identite
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Prenom"
                error={errors.first_name?.message}
                icon={User}
                required
                htmlFor="first_name"
              >
                <input
                  id="first_name"
                  {...register('first_name')}
                  autoFocus
                  placeholder="Marie"
                  autoComplete="given-name"
                  aria-required="true"
                  aria-invalid={!!errors.first_name}
                  className={inputCn(errors.first_name?.message)}
                />
              </Field>

              <Field
                label="Nom"
                error={errors.last_name?.message}
                icon={User}
                required
                htmlFor="last_name"
              >
                <input
                  id="last_name"
                  {...register('last_name')}
                  placeholder="Dupont"
                  autoComplete="family-name"
                  aria-required="true"
                  aria-invalid={!!errors.last_name}
                  className={inputCn(errors.last_name?.message)}
                />
              </Field>
            </div>
          </section>

          {/* -- COORDONNEES -- */}
          <section aria-labelledby="section-coords">
            <p
              id="section-coords"
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3"
            >
              Coordonnees
            </p>
            <div className="space-y-4">
              <Field
                label="Email"
                error={errors.email?.message}
                icon={Mail}
                htmlFor="email"
              >
                <input
                  id="email"
                  {...register('email')}
                  type="email"
                  placeholder="marie.dupont@exemple.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className={inputCn(errors.email?.message)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Telephone" icon={Phone} htmlFor="phone">
                  <input
                    id="phone"
                    {...register('phone')}
                    type="tel"
                    placeholder="+33 6 00 00 00 00"
                    autoComplete="tel"
                    className={inputNormal}
                  />
                </Field>
                <Field label="Mobile" icon={Smartphone} htmlFor="mobile">
                  <input
                    id="mobile"
                    {...register('mobile')}
                    type="tel"
                    placeholder="+33 7 00 00 00 00"
                    autoComplete="tel"
                    className={inputNormal}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* -- POSTE & ORGANISATION -- */}
          <section aria-labelledby="section-poste">
            <p
              id="section-poste"
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3"
            >
              Poste et organisation
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Titre / Poste" icon={Briefcase} htmlFor="job_title">
                  <input
                    id="job_title"
                    {...register('job_title')}
                    placeholder="Directrice commerciale"
                    autoComplete="organization-title"
                    className={inputNormal}
                  />
                </Field>
                <Field label="Departement" htmlFor="department">
                  <input
                    id="department"
                    {...register('department')}
                    placeholder="Commercial"
                    className={inputNormal}
                  />
                </Field>
              </div>

              {/* -- DROPDOWN ENTREPRISE (synchronise avec GET /companies) -- */}
              <Field
                label="Entreprise associee"
                error={errors.company_id?.message}
                icon={Building2}
                htmlFor="company_id"
              >
                <div className="relative">
                  <select
                    id="company_id"
                    {...register('company_id')}
                    disabled={loadingCompanies}
                    aria-invalid={!!errors.company_id}
                    aria-describedby={errors.company_id ? 'company_id_error' : undefined}
                    className={cn(
                      'w-full px-3 py-2.5 pr-8 text-sm bg-slate-900 border text-slate-300',
                      'outline-none transition-all rounded-none appearance-none',
                      'disabled:opacity-50 disabled:cursor-wait',
                      errors.company_id
                        ? 'border-red-500/60 focus:border-red-400'
                        : 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
                    )}
                  >
                    <option value="">
                      {loadingCompanies ? 'Chargement...' : 'Aucune entreprise'}
                    </option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {/* Icone chevron custom (remplace l'emoji) */}
                  <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
                {/* Indicateur de chargement sous le select */}
                {loadingCompanies && (
                  <p className="mt-1 text-[11px] text-slate-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    Chargement des entreprises...
                  </p>
                )}
              </Field>
            </div>
          </section>

          {/* -- LOCALISATION & RESEAUX -- */}
          <section aria-labelledby="section-local">
            <p
              id="section-local"
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3"
            >
              Localisation et reseaux
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ville" icon={MapPin} htmlFor="city">
                  <input
                    id="city"
                    {...register('city')}
                    placeholder="Paris"
                    autoComplete="address-level2"
                    className={inputNormal}
                  />
                </Field>
                <Field label="Pays" htmlFor="country">
                  <input
                    id="country"
                    {...register('country')}
                    placeholder="France"
                    autoComplete="country-name"
                    className={inputNormal}
                  />
                </Field>
              </div>
              <Field
                label="LinkedIn"
                error={errors.linkedin_url?.message}
                icon={Linkedin}
                htmlFor="linkedin_url"
              >
                <input
                  id="linkedin_url"
                  {...register('linkedin_url')}
                  type="url"
                  placeholder="https://linkedin.com/in/marie-dupont"
                  aria-invalid={!!errors.linkedin_url}
                  className={inputCn(errors.linkedin_url?.message)}
                />
              </Field>
            </div>
          </section>

          {/* -- MARKETING & NOTES -- */}
          <section aria-labelledby="section-marketing">
            <p
              id="section-marketing"
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3"
            >
              Marketing et notes
            </p>

            {/* Toggle abonnement -- Controller pour valeur boolean */}
            <Controller
              control={control}
              name="is_subscribed"
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 border text-left transition-all',
                    field.value
                      ? 'border-emerald-700/50 bg-emerald-950/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-500'
                  )}
                >
                  {field.value
                    ? <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
                    : <BellOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                  }
                  <div>
                    <p className="text-xs font-bold">
                      {field.value
                        ? 'Abonne aux emails marketing'
                        : 'Non abonne aux emails marketing'
                      }
                    </p>
                    <p className="text-[11px] opacity-60 mt-0.5">
                      {field.value
                        ? 'Ce contact recevra les campagnes emails.'
                        : 'Ce contact ne recevra pas les campagnes emails.'
                      }
                    </p>
                  </div>
                </button>
              )}
            />

            <div className="mt-4">
              <Field label="Notes internes" icon={FileText} htmlFor="notes">
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={3}
                  placeholder="Informations complementaires sur ce contact..."
                  className={cn(inputNormal, 'resize-none')}
                />
              </Field>
            </div>
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
            form="contact-form"
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wider uppercase',
              'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700',
              'transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {isSubmitting
              ? 'Enregistrement...'
              : isEdit ? 'Modifier le contact' : 'Creer le contact'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
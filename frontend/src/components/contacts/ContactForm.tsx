'use client'
// ============================================================
// components/contacts/ContactForm.tsx
// Formulaire création/édition — React Hook Form + Zod
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
} from 'lucide-react'
import { contactsService }  from '@/services/contacts.service'
import { companiesService } from '@/services/companies.service'
import { useToast }         from '@/hooks/useToast'
import { cn }               from '@/lib/utils'
import type { Contact, CompanyOption } from '@/types/crm.types'

// ── Schéma Zod ────────────────────────────────────────────────

const contactSchema = z.object({
  first_name:    z.string().min(1, 'Le prénom est obligatoire').max(100),
  last_name:     z.string().min(1, 'Le nom est obligatoire').max(100),
  email:         z.string().email('Format d\'email invalide').optional().or(z.literal('')),
  phone:         z.string().optional(),
  mobile:        z.string().optional(),
  job_title:     z.string().optional(),
  department:    z.string().optional(),
  company_id:    z.string().uuid('Sélectionnez une entreprise valide').optional().or(z.literal('')),
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
  label:    string
  error?:   string
  children: React.ReactNode
  icon?:    React.ElementType
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
          <span className="w-1 h-1 rounded-full bg-red-400 shrink-0 inline-block" />
          {error}
        </p>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────

export function ContactForm({ contact, onClose, onSaved }: ContactFormProps) {
  const { toast }               = useToast()
  const isEdit                  = !!contact?.id
  const [companies, setCompanies] = useState<CompanyOption[]>([])

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

  const isSubscribed = watch('is_subscribed')

  // Pré-remplissage en mode édition
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

  // Chargement des entreprises
  useEffect(() => {
    companiesService.listOptions().then(setCompanies).catch(() => {})
  }, [])

  const onSubmit = async (data: ContactFormData) => {
    try {
      const payload = {
        ...data,
        email:        data.email        || undefined,
        phone:        data.phone        || undefined,
        mobile:       data.mobile       || undefined,
        job_title:    data.job_title    || undefined,
        department:   data.department   || undefined,
        company_id:   data.company_id   || undefined,
        linkedin_url: data.linkedin_url || undefined,
        city:         data.city         || undefined,
        country:      data.country      || undefined,
        notes:        data.notes        || undefined,
      }

      let saved: Contact
      if (isEdit && contact) {
        saved = await contactsService.update(contact.id, payload)
        toast('success', 'Contact modifié', `${saved.first_name} ${saved.last_name} a été mis à jour.`)
      } else {
        saved = await contactsService.create(payload)
        toast('success', 'Contact créé', `${saved.first_name} ${saved.last_name} a été ajouté.`)
      }
      onSaved(saved)
    } catch (err: any) {
      const msg = err?.message ?? 'Une erreur est survenue.'
      toast('error', 'Erreur', msg.includes('{') ? 'Données invalides, vérifiez le formulaire.' : msg)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-950 border border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60">
        {/* En-tête */}
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
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps du formulaire */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-5"
        >
          {/* Identité */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Identité
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom" error={errors.first_name?.message} icon={User} required>
                <input
                  {...register('first_name')}
                  autoFocus
                  placeholder="Marie"
                  className={cn(
                    'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200',
                    'placeholder:text-slate-700 outline-none transition-all rounded-none',
                    errors.first_name
                      ? 'border-red-500/60 focus:border-red-400'
                      : 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
                  )}
                />
              </Field>
              <Field label="Nom" error={errors.last_name?.message} icon={User} required>
                <input
                  {...register('last_name')}
                  placeholder="Dupont"
                  className={cn(
                    'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200',
                    'placeholder:text-slate-700 outline-none transition-all rounded-none',
                    errors.last_name
                      ? 'border-red-500/60 focus:border-red-400'
                      : 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
                  )}
                />
              </Field>
            </div>
          </section>

          {/* Coordonnées */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Coordonnées
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Email" error={errors.email?.message} icon={Mail}>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="marie.dupont@exemple.com"
                  className={cn(
                    'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200',
                    'placeholder:text-slate-700 outline-none transition-all rounded-none',
                    errors.email
                      ? 'border-red-500/60 focus:border-red-400'
                      : 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
                  )}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Téléphone" error={errors.phone?.message} icon={Phone}>
                  <input
                    {...register('phone')}
                    placeholder="+33 6 00 00 00 00"
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                  />
                </Field>
                <Field label="Mobile" error={errors.mobile?.message} icon={Smartphone}>
                  <input
                    {...register('mobile')}
                    placeholder="+33 6 00 00 00 00"
                    className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Poste & Entreprise */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Poste et organisation
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Titre / Poste" error={errors.job_title?.message} icon={Briefcase}>
                <input
                  {...register('job_title')}
                  placeholder="Directrice commerciale"
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                />
              </Field>
              <Field label="Département" error={errors.department?.message}>
                <input
                  {...register('department')}
                  placeholder="Commercial"
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                />
              </Field>
            </div>

            {/* Entreprise — menu déroulant */}
            <div className="mt-4">
              <Field label="Entreprise associée" error={errors.company_id?.message} icon={Building2}>
                <select
                  {...register('company_id')}
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-300 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none"
                >
                  <option value="">Aucune entreprise</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Localisation & Réseaux */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Localisation et réseaux
            </p>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="mt-4">
              <Field label="LinkedIn" error={errors.linkedin_url?.message} icon={Linkedin}>
                <input
                  {...register('linkedin_url')}
                  type="url"
                  placeholder="https://linkedin.com/in/marie-dupont"
                  className={cn(
                    'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200',
                    'placeholder:text-slate-700 outline-none transition-all rounded-none',
                    errors.linkedin_url
                      ? 'border-red-500/60 focus:border-red-400'
                      : 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20'
                  )}
                />
              </Field>
            </div>
          </section>

          {/* Marketing & Notes */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Marketing et notes
            </p>

            {/* Toggle abonnement */}
            <Controller
              control={control}
              name="is_subscribed"
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 border text-left transition-all',
                    field.value
                      ? 'border-emerald-700/50 bg-emerald-950/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-900 text-slate-500'
                  )}
                >
                  {field.value
                    ? <Bell className="w-4 h-4 shrink-0" />
                    : <BellOff className="w-4 h-4 shrink-0" />
                  }
                  <div>
                    <p className="text-xs font-bold">
                      {field.value ? 'Abonné aux emails marketing' : 'Non abonné aux emails marketing'}
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
              <Field label="Notes internes" icon={FileText}>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Informations complémentaires sur ce contact..."
                  className="w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 transition-all rounded-none resize-none"
                />
              </Field>
            </div>
          </section>
        </form>

        {/* Pied du formulaire */}
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
            form=""
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wider uppercase',
              'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700',
              'transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSubmitting
              ? 'Enregistrement...'
              : isEdit ? 'Modifier le contact' : 'Créer le contact'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
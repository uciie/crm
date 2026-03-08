'use client'
// ============================================================
// components/campaigns/CampaignModal.tsx
// Modal création d'une campagne email — POST /email/campaigns
// ============================================================

import { useForm }     from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }           from 'zod'
import {
  X, Loader2, Mail, Tag, AlignLeft, Users, Calendar, AlertCircle,
} from 'lucide-react'
import { api }       from '@/lib/api'
import { useToast }  from '@/hooks/useToast'
import { cn }        from '@/lib/utils'
import type { EmailCampaign } from '@/types'

// ── Schéma Zod ────────────────────────────────────────────────

const campaignSchema = z.object({
  name:        z.string().min(1, 'Le nom est obligatoire').max(255),
  subject:     z.string().min(1, "L'objet est obligatoire").max(255),
  htmlContent: z.string().min(1, 'Le contenu HTML est obligatoire'),
  listIds:     z
    .string()
    .min(1, 'Au moins un ID de liste Brevo est requis')
    .refine(
      v => v.split(',').every(s => /^\d+$/.test(s.trim())),
      'Format attendu : IDs numériques séparés par des virgules (ex: 3, 7)',
    ),
  scheduledAt: z.string().optional(),
})

type CampaignFormData = z.infer<typeof campaignSchema>

// ── Styles partagés ───────────────────────────────────────────

const inputBase =
  'w-full px-3 py-2.5 text-sm bg-slate-900 border text-slate-200 ' +
  'placeholder:text-slate-700 outline-none transition-all rounded-none'

const inputNormal = cn(inputBase, 'border-slate-800 focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20')
const inputErr    = cn(inputBase, 'border-red-500/60 focus:border-red-400')
const cls = (err?: string) => err ? inputErr : inputNormal

// ── Sous-composant Field ──────────────────────────────────────

function Field({
  label, error, children, icon: Icon, required, htmlFor, hint,
}: {
  label:     string
  error?:    string
  children:  React.ReactNode
  icon?:     React.ElementType
  required?: boolean
  htmlFor?:  string
  hint?:     string
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5"
      >
        {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-slate-600">{hint}</p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────

export interface CampaignModalProps {
  onClose:  () => void
  onSaved:  (c: EmailCampaign) => void
}

// ── Composant ─────────────────────────────────────────────────

export function CampaignModal({ onClose, onSaved }: CampaignModalProps) {
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name:        '',
      subject:     '',
      htmlContent: '',
      listIds:     '',
      scheduledAt: '',
    },
  })

  const onSubmit = async (data: CampaignFormData) => {
    try {
      const listIds = data.listIds
        .split(',')
        .map(s => Number(s.trim()))
        .filter(Boolean)

      const payload: Record<string, unknown> = {
        name:        data.name,
        subject:     data.subject,
        htmlContent: data.htmlContent,
        listIds,
      }
      if (data.scheduledAt) payload.scheduledAt = data.scheduledAt

      const saved = await api.post<EmailCampaign>('/email/campaigns', payload)
      toast('success', 'Campagne créée', `"${saved.name}" a été envoyée à Brevo.`)
      onSaved(saved)
    } catch (err: any) {
      toast('error', 'Erreur', err?.message ?? 'Une erreur est survenue.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Nouvelle campagne email"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-950 border border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60">

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="h-px w-8 bg-blue-500 mb-2" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">
              Nouvelle campagne email
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">Créée et planifiée via Brevo</p>
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
          id="campaign-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-5"
          noValidate
        >

          {/* Identification */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Identification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom de la campagne" error={errors.name?.message} icon={Tag} required htmlFor="cp-name">
                <input
                  id="cp-name"
                  {...register('name')}
                  autoFocus
                  placeholder="Black Friday 2025"
                  className={cls(errors.name?.message)}
                />
              </Field>

              <Field label="Objet de l'email" error={errors.subject?.message} icon={Mail} required htmlFor="cp-subject">
                <input
                  id="cp-subject"
                  {...register('subject')}
                  placeholder="🎉 Offre exclusive — 48h seulement"
                  className={cls(errors.subject?.message)}
                />
              </Field>
            </div>
          </section>

          {/* Contenu */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Contenu
            </p>
            <Field
              label="Contenu HTML"
              error={errors.htmlContent?.message}
              icon={AlignLeft}
              required
              htmlFor="cp-html"
              hint="Copiez-collez votre HTML complet ou celui exporté depuis Brevo."
            >
              <textarea
                id="cp-html"
                {...register('htmlContent')}
                rows={8}
                placeholder={'<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Bonjour !</h1>\n  </body>\n</html>'}
                className={cn(cls(errors.htmlContent?.message), 'resize-y font-mono text-xs leading-relaxed')}
              />
            </Field>
          </section>

          {/* Distribution */}
          <section>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-700 mb-3">
              Distribution
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="IDs de listes Brevo"
                error={errors.listIds?.message}
                icon={Users}
                required
                htmlFor="cp-lists"
                hint="Trouvez vos IDs dans Brevo → Contacts → Listes."
              >
                <input
                  id="cp-lists"
                  {...register('listIds')}
                  placeholder="3, 7, 12"
                  className={cls(errors.listIds?.message)}
                />
              </Field>

              <Field
                label="Date de planification"
                error={errors.scheduledAt?.message}
                icon={Calendar}
                htmlFor="cp-scheduled"
                hint="Laisser vide pour enregistrer en brouillon."
              >
                <input
                  id="cp-scheduled"
                  {...register('scheduledAt')}
                  type="datetime-local"
                  className={cn(
                    cls(errors.scheduledAt?.message),
                    // style the native date picker to match dark theme
                    '[color-scheme:dark]',
                  )}
                />
              </Field>
            </div>
          </section>

          {/* Note informative */}
          <div className="flex items-start gap-3 px-4 py-3 border border-slate-800 bg-slate-900/50">
            <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              La campagne sera créée dans votre compte Brevo. Si une date est renseignée,
              elle sera planifiée automatiquement ; sinon elle restera en statut{' '}
              <span className="text-slate-400 font-bold">brouillon</span> jusqu'à envoi manuel.
            </p>
          </div>
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
            form="campaign-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {isSubmitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Création en cours...</>
              : <><Mail className="w-3.5 h-3.5" />Créer la campagne</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'
import { useForm }  from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }        from 'zod'
import {
  PlusCircle, RefreshCcw, CheckCircle2,
  XCircle, Loader2, X,
} from 'lucide-react'
import { leadsService } from '@/services/leads.service'
import { useToast }     from '@/hooks/useToast'
import { cn }           from '@/lib/utils'
import type { Lead }    from '@/types'

// ── Schéma Zod ────────────────────────────────────────────────
const leadSchema = z.object({
  title:               z.string().min(1, 'Le titre est obligatoire').max(255),
  status:              z.enum(['nouveau','contacté','qualifié','proposition','négociation','gagné','perdu']).default('nouveau'),
  value:               z.coerce.number().min(0).optional(),
  probability:         z.coerce.number().min(0).max(100).default(0),
  expected_close_date: z.string().optional(),
  source:              z.string().optional(),
  notes:               z.string().optional(),
})
type LeadFormData = z.infer<typeof leadSchema>

// ── Icônes par statut (Lucide obligatoire) ────────────────────
const STATUS_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  nouveau:     { icon: PlusCircle,   color: 'text-slate-400',   bg: 'bg-slate-900' },
  contacté:    { icon: RefreshCcw,   color: 'text-blue-400',    bg: 'bg-blue-950/40' },
  qualifié:    { icon: RefreshCcw,   color: 'text-amber-400',   bg: 'bg-amber-950/40' },
  proposition: { icon: RefreshCcw,   color: 'text-violet-400',  bg: 'bg-violet-950/40' },
  négociation: { icon: RefreshCcw,   color: 'text-orange-400',  bg: 'bg-orange-950/40' },
  gagné:       { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
  perdu:       { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-950/40' },
}

const STATUS_LIST = Object.keys(STATUS_ICONS)

interface LeadFormProps {
  lead?:    Lead | null
  onClose:  () => void
  onSaved:  (lead: Lead) => void
  addToPipeline?: boolean
}

const inputCn = 'w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-800 text-slate-200 ' +
  'placeholder:text-slate-700 outline-none focus:border-blue-600/60 focus:ring-1 focus:ring-blue-600/20 rounded-none'

export function LeadForm({ lead, onClose, onSaved, addToPipeline = false }: LeadFormProps) {
  const { toast }  = useToast()
  const isEdit     = !!lead?.id

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<LeadFormData>({
      resolver: zodResolver(leadSchema),
      defaultValues: {
        title:               lead?.title               ?? '',
        status:              lead?.status              ?? 'nouveau',
        value:               lead?.value               ? Number(lead.value) : undefined,
        probability:         lead?.probability         ?? 0,
        expected_close_date: lead?.expected_close_date ?? '',
        source:              lead?.source              ?? '',
        notes:               lead?.notes               ?? '',
      },
    })

  const currentStatus = watch('status')
  const statusCfg     = STATUS_ICONS[currentStatus] ?? STATUS_ICONS.nouveau
  const StatusIcon    = statusCfg.icon

  const onSubmit = async (data: LeadFormData) => {
    try {
      const payload = {
        ...data,
        value:               data.value ?? undefined,
        expected_close_date: data.expected_close_date || undefined,
        source:              data.source              || undefined,
        notes:               data.notes               || undefined,
      }

      let saved: Lead
      if (isEdit && lead) {
        saved = await leadsService.update(lead.id, payload)
        toast('success', 'Lead modifié', saved.title)
      } else {
        saved = await leadsService.create(payload)
        if (addToPipeline) {
          await leadsService.createPipelineDeal(saved.id)
        }
        toast('success', 'Lead créé', saved.title)
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
      role="dialog" aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-950 border border-slate-800 w-full max-w-lg flex flex-col shadow-2xl">
        {/* En-tete */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <div className="h-px w-8 bg-blue-500 mb-2" />
            <h2 className="text-sm font-bold text-slate-100">
              {isEdit ? 'Modifier le lead' : 'Nouveau lead'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-900 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire */}
        <form id="lead-form" onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-5" noValidate>

          {/* Titre */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
              Titre <span className="text-red-500">*</span>
            </label>
            <input {...register('title')} autoFocus placeholder="Ex: Projet ERP — ACME Corp"
              className={cn(inputCn, errors.title && 'border-red-500/60')} />
            {errors.title && (
              <p className="mt-1 text-[11px] text-red-400">{errors.title.message}</p>
            )}
          </div>

          {/* Statut avec icone Lucide */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
              Statut
            </label>
            <div className="relative">
              <select {...register('status')}
                className={cn(inputCn, 'pr-10 appearance-none')}>
                {STATUS_LIST.map(s => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              {/* Icone du statut courant — Lucide */}
              <StatusIcon className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
                statusCfg.color
              )} />
            </div>
          </div>

          {/* Valeur + Probabilité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
                Valeur (€)
              </label>
              <input type="number" min="0" {...register('value')}
                placeholder="25000" className={inputCn} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
                Probabilité (%)
              </label>
              <input type="number" min="0" max="100" {...register('probability')}
                className={inputCn} />
              {errors.probability && (
                <p className="mt-1 text-[11px] text-red-400">{errors.probability.message}</p>
              )}
            </div>
          </div>

          {/* Source + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
                Source
              </label>
              <input {...register('source')} placeholder="LinkedIn, Referral..."
                className={inputCn} />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
                Date de clôture
              </label>
              <input type="date" {...register('expected_close_date')}
                className={inputCn} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1.5">
              Notes
            </label>
            <textarea rows={3} {...register('notes')}
              placeholder="Contexte, prochaines étapes..."
              className={cn(inputCn, 'resize-none')} />
          </div>
        </form>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-slate-500 border border-slate-800 hover:border-slate-600 hover:text-slate-300 transition-all">
            Annuler
          </button>
          <button type="submit" form="lead-form" disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-wider uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-50">
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSubmitting ? 'Enregistrement...' : isEdit ? 'Modifier' : addToPipeline ? 'Créer & ajouter au pipeline' : 'Créer le lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
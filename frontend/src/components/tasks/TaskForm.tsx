// ─────────────────────────────────────────────────────────────────────────────
// components/tasks/TaskForm.tsx — Formulaire création / édition / consultation
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell, CalendarDays, Phone, CheckSquare,
  Clock, User, TrendingUp, AlertCircle, Pencil,
} from 'lucide-react'
import { Modal }   from '@/components/ui/Modal'
import { Button }  from '@/components/ui/Button'
import { TaskType, TaskStatus, TaskPriority } from '@/types/index'
import type { Task } from '@/types/index'
import { useFormOptions } from '@/hooks/useTasks'

// ─────────────────────────────────────────────────────────────────────────────
// Schéma Zod
// ─────────────────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title:       z.string().min(1, 'Titre requis').max(255),
  description: z.string().max(2000).optional(),
  type:        z.nativeEnum(TaskType),
  status:      z.nativeEnum(TaskStatus),
  priority:    z.nativeEnum(TaskPriority),
  due_date:    z.string().optional(),
  contact_id:  z.string().uuid().optional().or(z.literal('')),
  lead_id:     z.string().uuid().optional().or(z.literal('')),
})
type Schema = z.infer<typeof taskSchema>
export type TaskFormValues = z.infer<typeof taskSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────────

const INPUT = [
  'w-full px-3 py-2 text-sm text-slate-200 bg-slate-900 border border-slate-700',
  'placeholder:text-slate-600',
  'hover:border-slate-600',
  'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30',
  'transition-colors duration-150',
].join(' ')

const INPUT_READONLY = [
  'w-full px-3 py-2 text-sm text-slate-300 bg-slate-950 border border-slate-800',
  'cursor-default select-text',
].join(' ')

const SELECT      = INPUT + ' cursor-pointer'
const SELECT_READONLY = INPUT_READONLY

function Field({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium">
          <AlertCircle size={11} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur de type visuel
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: TaskType.Rappel,     label: 'Rappel',      Icon: Bell,         activeColor: 'border-amber-500 bg-amber-950/40 text-amber-400'      },
  { value: TaskType.RendezVous, label: 'Rendez-vous', Icon: CalendarDays, activeColor: 'border-blue-500  bg-blue-950/40  text-blue-400'        },
  { value: TaskType.Appel,      label: 'Appel',       Icon: Phone,        activeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-400' },
  { value: TaskType.Tache,      label: 'Tâche',       Icon: CheckSquare,  activeColor: 'border-slate-500 bg-slate-800/60 text-slate-300'       },
]

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface TaskFormProps {
  open:      boolean
  onClose:   () => void
  onSubmit:  (values: TaskFormValues) => Promise<void>
  onEdit?:   () => void   // appelé quand l'utilisateur clique "Modifier" en mode lecture
  task?:     Task
  readOnly?: boolean      // true = mode consultation, false/absent = création ou édition
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TaskForm({ open, onClose, onSubmit, onEdit, task, readOnly = false }: TaskFormProps) {
  const isEditing  = Boolean(task) && !readOnly
  const isCreating = !task
  const { contacts, leads } = useFormOptions()
  console.log('task reçu dans TaskForm :', task)
  const defaults = {
    title:       task?.title       ?? '',
    description: task?.description ?? '',
    type:        task?.type        ?? TaskType.Tache,
    status:      task?.status      ?? TaskStatus.AFaire,
    priority:    task?.priority    ?? TaskPriority.Moyenne,
    due_date:    task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    contact_id:  task?.contact_id  ?? '',
    lead_id:     task?.lead_id     ?? '',
  }

  const {
    register, control, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({ resolver: zodResolver(taskSchema), defaultValues: defaults })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, task, contacts, leads])

  async function handleValid(values: Schema) {
    const payload: Record<string, unknown> = {
      ...values,
      due_date: values.due_date || undefined,
    }

    // Supprimer les clés UUID vides plutôt qu'envoyer null/''
    // Le backend ne touche pas aux champs absents d'un PATCH
    if (!values.contact_id) delete payload.contact_id
    if (!values.lead_id)    delete payload.lead_id
    console.log('PAYLOAD ENVOYÉ :', JSON.stringify(payload, null, 2))
    await onSubmit(payload as TaskFormValues)
    onClose()
  }
  // Ajouter temporairement dans TaskForm pour debugger
console.log('contact_id en base :', task?.contact_id)
console.log('options disponibles :', contacts.map(c => c.id))
console.log('trouvé ?', contacts.some(c => c.id === task?.contact_id))

  // Titre et sous-titre dynamiques selon le mode
  const modalTitle = readOnly
    ? 'Détail de la tâche'
    : isEditing
      ? 'Modifier la tâche'
      : 'Nouvelle tâche'

  const modalSubtitle = readOnly
    ? `Consultation · ${task?.id.slice(0, 8)}…`
    : isEditing
      ? `Édition · ${task?.id.slice(0, 8)}…`
      : 'Planifier une activité'

  if (!open) return null

  return (
    <Modal
      title={modalTitle}
      subtitle={modalSubtitle}
      onClose={onClose}
      size="lg"
      footer={
        readOnly ? (
          // ── Mode lecture : Fermer + bouton Modifier ───────────────────────
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fermer
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                icon={<Pencil size={13} />}
                onClick={onEdit}
              >
                Modifier
              </Button>
            )}
          </>
        ) : (
          // ── Mode création / édition ───────────────────────────────────────
          <>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={handleSubmit(handleValid)}
            >
              {isCreating ? 'Créer la tâche' : 'Enregistrer'}
            </Button>
          </>
        )
      }
    >
      <form onSubmit={handleSubmit(handleValid)} noValidate className="px-6 py-5 space-y-6">

        {/* Titre */}
        <Field label="Titre" required={!readOnly} error={errors.title?.message}>
          <input
            {...register('title')}
            readOnly={readOnly}
            placeholder={readOnly ? '' : 'Ex : Rappeler M. Dupont avant signature'}
            autoFocus={!readOnly}
            className={readOnly ? INPUT_READONLY : INPUT}
          />
        </Field>

        {/* Description */}
        <Field label="Description" error={errors.description?.message}>
          <textarea
            {...register('description')}
            readOnly={readOnly}
            rows={3}
            placeholder={readOnly ? '' : 'Contexte ou instructions supplémentaires…'}
            className={`${readOnly ? INPUT_READONLY : INPUT} resize-none`}
          />
        </Field>

        {/* Type — sélecteur visuel */}
        <Field label="Type d'activité" required={!readOnly} error={errors.type?.message}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup">
                {TYPE_OPTIONS.map(({ value, label, Icon, activeColor }) => {
                  const active = field.value === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      // En mode lecture : désactiver les clics sur les types non actifs
                      onClick={() => { if (!readOnly) field.onChange(value) }}
                      className={[
                        'flex flex-col items-center gap-2 py-4 px-2',
                        'text-[10px] font-bold tracking-[0.12em] uppercase border',
                        'transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        readOnly
                          ? active
                            ? activeColor
                            : 'border-slate-800 bg-slate-950 text-slate-600 opacity-40'
                          : active
                            ? activeColor
                            : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-400',
                        readOnly ? 'cursor-default' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          />
        </Field>

        {/* Priorité + Statut */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Priorité" required={!readOnly} error={errors.priority?.message}>
            <select
              {...register('priority')}
              disabled={readOnly}
              className={readOnly ? SELECT_READONLY : SELECT}
            >
              <option value={TaskPriority.Basse}>Basse</option>
              <option value={TaskPriority.Moyenne}>Moyenne</option>
              <option value={TaskPriority.Haute}>Haute</option>
              <option value={TaskPriority.Urgente}>Urgente</option>
            </select>
          </Field>
          <Field label="Statut" required={!readOnly} error={errors.status?.message}>
            <select
              {...register('status')}
              disabled={readOnly}
              className={readOnly ? SELECT_READONLY : SELECT}
            >
              <option value={TaskStatus.AFaire}>À faire</option>
              <option value={TaskStatus.EnCours}>En cours</option>
              <option value={TaskStatus.Terminee}>Terminée</option>
              <option value={TaskStatus.Annulee}>Annulée</option>
            </select>
          </Field>
        </div>

        {/* Date et heure */}
        <Field label="Date et heure d'échéance" error={errors.due_date?.message}>
          <div className="relative">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <input
              {...register('due_date')}
              type="datetime-local"
              readOnly={readOnly}
              className={`${readOnly ? INPUT_READONLY : INPUT} pl-9`}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </Field>

        {/* Contact / Lead */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Contact lié" error={errors.contact_id?.message}>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <select
                {...register('contact_id')}
                disabled={readOnly}
                className={`${readOnly ? SELECT_READONLY : SELECT} pl-9`}
              >
                console.log('shape options contact :', contacts[0])
                <option value="">Aucun contact</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Lead lié" error={errors.lead_id?.message}>
            <div className="relative">
              <TrendingUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <select
                {...register('lead_id')}
                disabled={readOnly}
                className={`${readOnly ? SELECT_READONLY : SELECT} pl-9`}
              >
                console.log('shape options leads :', leads[0])
                <option value="">Aucun lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
          </Field>
        </div>

      </form>
    </Modal>
  )
}
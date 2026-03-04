// ─────────────────────────────────────────────────────────────────────────────
// components/tasks/TaskForm.tsx — Formulaire création / édition
// Utilise : Modal, Button, Spinner du projet
// Validation : React Hook Form + Zod
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell, CalendarDays, Phone, CheckSquare,
  Clock, User, TrendingUp, AlertCircle,
} from 'lucide-react'
import { Modal }   from '@/components/ui/Modal'
import { Button }  from '@/components/ui/Button'
import { TaskType, TaskStatus, TaskPriority } from '@/types/index'
import type { Task, TaskFormValues } from '@/types/index'
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
  due_date: z.string().optional().refine(
    v => !v || new Date(v) > new Date(),
    { message: "La date ne peut pas être dans le passé" }
  ),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  lead_id:    z.string().uuid().optional().or(z.literal('')),
})

type Schema = z.infer<typeof taskSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────────

/** Input sombre, cohérent avec le design system slate-950 */
const INPUT = [
  'w-full px-3 py-2 text-sm text-slate-200 bg-slate-900 border border-slate-700',
  'placeholder:text-slate-600',
  'hover:border-slate-600',
  'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30',
  'transition-colors duration-150',
].join(' ')

const SELECT = INPUT + ' cursor-pointer'

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
// Sélecteur de type visuel (4 boutons)
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: TaskType.Rappel,     label: 'Rappel',      Icon: Bell,         activeColor: 'border-amber-500 bg-amber-950/40 text-amber-400'  },
  { value: TaskType.RendezVous, label: 'Rendez-vous', Icon: CalendarDays, activeColor: 'border-blue-500  bg-blue-950/40  text-blue-400'   },
  { value: TaskType.Appel,      label: 'Appel',       Icon: Phone,        activeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-400' },
  { value: TaskType.Tache,      label: 'Tâche',       Icon: CheckSquare,  activeColor: 'border-slate-500 bg-slate-800/60 text-slate-300'  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface TaskFormProps {
  open:     boolean
  onClose:  () => void
  onSubmit: (values: TaskFormValues) => Promise<void>
  task?:    Task
}

export function TaskForm({ open, onClose, onSubmit, task }: TaskFormProps) {
  const isEditing = Boolean(task)
  const { contacts, leads } = useFormOptions()

  const defaults = {
    title:       task?.title       ?? '',
    description: task?.description ?? '',
    type:        task?.type        ?? TaskType.Tache,
    status:      task?.status      ?? TaskStatus.AFaire,
    priority:    task?.priority    ?? TaskPriority.Moyenne,
    due_date:    task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    contact_id:  task?.contact?.id ?? '',
    lead_id:     task?.lead?.id    ?? '',
  }

  const {
    register, control, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({ resolver: zodResolver(taskSchema), defaultValues: defaults })

  useEffect(() => {
    if (open) reset(defaults)
  }, [open, task]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleValid(values: Schema) {
    await onSubmit({
      ...values,
      due_date:   values.due_date   || undefined,
      contact_id: values.contact_id || undefined,
      lead_id:    values.lead_id    || undefined,
    } as TaskFormValues)
    onClose()
  }

  if (!open) return null

  return (
    <Modal
      title={isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}
      subtitle={isEditing ? `Édition · ${task?.id.slice(0, 8)}…` : 'Planifier une activité'}
      onClose={onClose}
      size="lg"
      footer={
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
            {isEditing ? 'Enregistrer' : 'Créer la tâche'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleValid)} noValidate className="px-6 py-5 space-y-6">

        {/* Titre */}
        <Field label="Titre" required error={errors.title?.message}>
          <input
            {...register('title')}
            placeholder="Ex : Rappeler M. Dupont avant signature"
            autoFocus
            className={INPUT}
          />
        </Field>

        {/* Description */}
        <Field label="Description" error={errors.description?.message}>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Contexte ou instructions supplémentaires…"
            className={`${INPUT} resize-none`}
          />
        </Field>

        {/* Type — sélecteur visuel */}
        <Field label="Type d'activité" required error={errors.type?.message}>
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
                      onClick={() => field.onChange(value)}
                      className={[
                        'flex flex-col items-center gap-2 py-4 px-2',
                        'text-[10px] font-bold tracking-[0.12em] uppercase border',
                        'transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        active
                          ? activeColor
                          : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-400',
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
          <Field label="Priorité" required error={errors.priority?.message}>
            <select {...register('priority')} className={SELECT}>
              <option value={TaskPriority.Basse}>Basse</option>
              <option value={TaskPriority.Moyenne}>Moyenne</option>
              <option value={TaskPriority.Haute}>Haute</option>
              <option value={TaskPriority.Urgente}>Urgente</option>
            </select>
          </Field>
          <Field label="Statut" required error={errors.status?.message}>
            <select {...register('status')} className={SELECT}>
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
              min={new Date().toISOString().slice(0, 16)}
              className={`${INPUT} pl-9`}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </Field>

        {/* Contact / Lead */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Lier à un contact" error={errors.contact_id?.message}>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <select {...register('contact_id')} className={`${SELECT} pl-9`}>
                <option value="">Aucun contact</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Lier à un lead" error={errors.lead_id?.message}>
            <div className="relative">
              <TrendingUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              <select {...register('lead_id')} className={`${SELECT} pl-9`}>
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
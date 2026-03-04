// ─────────────────────────────────────────────────────────────────────────────
// lib/task-config.tsx — Configuration visuelle mappée sur le Badge du projet
// Variants disponibles : 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { Bell, CalendarDays, Phone, CheckSquare } from 'lucide-react'
import { TaskType, TaskStatus, TaskPriority } from '@/types/index'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

// ─────────────────────────────────────────────────────────────────────────────
// Type de tâche
// ─────────────────────────────────────────────────────────────────────────────

interface TaskTypeConfig {
  label:    string
  variant:  BadgeVariant
  Icon:     React.ElementType
  /** Classe Tailwind pour les pastilles calendrier */
  dotClass: string
  /** Couleur CSS brute pour les chips calendrier */
  chipBg:   string
  chipText: string
}

export const TASK_TYPE_CONFIG: Record<TaskType, TaskTypeConfig> = {
  [TaskType.Rappel]: {
    label:    'Rappel',
    variant:  'warning',          // amber
    Icon:     Bell,
    dotClass: 'bg-amber-500',
    chipBg:   'rgba(245,158,11,0.12)',
    chipText: '#fbbf24',
  },
  [TaskType.RendezVous]: {
    label:    'Rendez-vous',
    variant:  'info',             // blue
    Icon:     CalendarDays,
    dotClass: 'bg-blue-500',
    chipBg:   'rgba(59,130,246,0.12)',
    chipText: '#60a5fa',
  },
  [TaskType.Appel]: {
    label:    'Appel',
    variant:  'success',          // emerald
    Icon:     Phone,
    dotClass: 'bg-emerald-500',
    chipBg:   'rgba(16,185,129,0.12)',
    chipText: '#34d399',
  },
  [TaskType.Tache]: {
    label:    'Tâche',
    variant:  'default',          // slate
    Icon:     CheckSquare,
    dotClass: 'bg-slate-500',
    chipBg:   'rgba(100,116,139,0.15)',
    chipText: '#94a3b8',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Statut
// ─────────────────────────────────────────────────────────────────────────────

interface TaskStatusConfig {
  label:   string
  variant: BadgeVariant
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  [TaskStatus.AFaire]:   { label: 'À faire',  variant: 'default'  },
  [TaskStatus.EnCours]:  { label: 'En cours', variant: 'info'     },
  [TaskStatus.Terminee]: { label: 'Terminée', variant: 'success'  },
  [TaskStatus.Annulee]:  { label: 'Annulée',  variant: 'neutral'  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Priorité
// ─────────────────────────────────────────────────────────────────────────────

interface TaskPriorityConfig {
  label:   string
  variant: BadgeVariant
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, TaskPriorityConfig> = {
  [TaskPriority.Basse]:   { label: 'Basse',   variant: 'neutral'  },
  [TaskPriority.Moyenne]: { label: 'Moyenne', variant: 'default'  },
  [TaskPriority.Haute]:   { label: 'Haute',   variant: 'warning'  },
  [TaskPriority.Urgente]: { label: 'Urgente', variant: 'danger'   },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers date
// ─────────────────────────────────────────────────────────────────────────────

export function isOverdue(dueDate?: string, status?: TaskStatus): boolean {
  if (!dueDate) return false
  if (status === TaskStatus.Terminee || status === TaskStatus.Annulee) return false
  return new Date(dueDate) < new Date()
}

export function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const now = new Date()
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth()    === now.getMonth()    &&
    due.getDate()     === now.getDate()
  )
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function formatTime(iso?: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
// ─────────────────────────────────────────────────────────────────────────────
// components/tasks/TaskList.tsx — Gestionnaire de tâches (vue Liste)
// Utilise : Badge, Button, DataTable, Spinner, Skeleton du projet
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle2, AlertTriangle, CalendarCheck, CalendarClock,
  Pencil, Trash2, Circle, Clock3, ChevronRight,
  User, TrendingUp,
} from 'lucide-react'
import { Badge }      from '@/components/ui/Badge'
import { Button }     from '@/components/ui/Button'
import { DataTable }  from '@/components/ui/DataTable'
import { Skeleton }   from '@/components/ui/Skeleton'
import {
  TASK_TYPE_CONFIG, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG,
  isOverdue, isDueToday, formatDate,
} from '../../lib/task-config'
import { TaskStatus, TaskPriority } from '../../types/index'
import type { Task } from '../../types/index'

// ─────────────────────────────────────────────────────────────────────────────
// Types filtres
// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter  = 'all' | 'a_faire' | 'terminee'
type UrgencyFilter = 'all' | 'overdue' | 'today' | 'upcoming'

interface TaskListProps {
  tasks:    Task[]
  loading:  boolean
  onToggle: (task: Task) => void
  onEdit:   (task: Task) => void
  onDelete: (id: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill de filtre (onglet)
// ─────────────────────────────────────────────────────────────────────────────

function FilterPill<T extends string>({
  value, current, label, count, icon, onChange, activeClass,
}: {
  value: T; current: T; label: string; count?: number; icon: React.ReactNode
  onChange: (v: T) => void; activeClass: string
}) {
  const active = value === current
  return (
    <button
      onClick={() => onChange(value)}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-1.5 h-7 px-3',
        'text-[10px] font-bold tracking-[0.12em] uppercase border',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        active
          ? activeClass
          : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400',
      ].join(' ')}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={[
          'ml-0.5 px-1.5 py-px text-[9px] font-bold',
          active ? 'bg-white/20 text-current' : 'bg-slate-800 text-slate-500',
        ].join(' ')}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cellule titre avec checkbox toggle
// ─────────────────────────────────────────────────────────────────────────────

function TitleCell({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const done    = task.status === TaskStatus.Terminee
  const overdue = isOverdue(task.due_date, task.status)
  const typeCfg = TASK_TYPE_CONFIG[task.type]
  const TypeIcon = typeCfg.Icon

  return (
    <div className="flex items-center gap-3">
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        aria-label={done ? 'Rouvrir la tâche' : 'Marquer terminée'}
        className={[
          'flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          done
            ? 'bg-emerald-600 border-emerald-600'
            : 'border-slate-700 hover:border-blue-500',
        ].join(' ')}
      >
        {done && <CheckCircle2 size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <TypeIcon size={13} className={done ? 'text-slate-700' : `text-${typeCfg.variant === 'warning' ? 'amber' : typeCfg.variant === 'success' ? 'emerald' : typeCfg.variant === 'info' ? 'blue' : 'slate'}-500`} />
          <span className={[
            'text-sm font-medium truncate',
            done ? 'line-through text-slate-600' : overdue ? 'text-red-400' : 'text-slate-200',
          ].join(' ')}>
            {task.title}
          </span>
          {overdue && !done && (
            <AlertTriangle size={12} className="text-red-500 shrink-0" />
          )}
        </div>
        {task.description && (
          <p className="text-[11px] text-slate-600 truncate mt-0.5">{task.description}</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function TaskList({ tasks, loading, onToggle, onEdit, onDelete }: TaskListProps) {
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')

  // Compteurs
  const counts = useMemo(() => ({
    overdue:  tasks.filter(t => isOverdue(t.due_date, t.status)).length,
    today:    tasks.filter(t => isDueToday(t.due_date) && !isOverdue(t.due_date, t.status)).length,
    upcoming: tasks.filter(t => {
      if (!t.due_date) return false
      return new Date(t.due_date) > new Date() && !isDueToday(t.due_date)
    }).length,
    done: tasks.filter(t => t.status === TaskStatus.Terminee).length,
    todo: tasks.filter(t => t.status !== TaskStatus.Terminee && t.status !== TaskStatus.Annulee).length,
  }), [tasks])

  // Filtrage
  const filtered = useMemo(() => tasks.filter(task => {
    if (statusFilter === 'a_faire'  && (task.status === TaskStatus.Terminee || task.status === TaskStatus.Annulee)) return false
    if (statusFilter === 'terminee' && task.status !== TaskStatus.Terminee) return false
    if (urgencyFilter === 'overdue'  && !isOverdue(task.due_date, task.status)) return false
    if (urgencyFilter === 'today'    && !isDueToday(task.due_date)) return false
    if (urgencyFilter === 'upcoming') {
      if (!task.due_date || new Date(task.due_date) <= new Date() || isDueToday(task.due_date)) return false
    }
    return true
  }), [tasks, statusFilter, urgencyFilter])

  // Colonnes DataTable
  const columns = useMemo(() => [
    {
      key: 'title',
      label: 'Tâche',
      render: (row: Task) => (
        <TitleCell task={row} onToggle={() => onToggle(row)} />
      ),
    },
    {
      key: 'type',
      label: 'Type',
      width: '120px',
      render: (row: Task) => {
        const cfg = TASK_TYPE_CONFIG[row.type]
        return <Badge label={cfg.label} variant={cfg.variant} dot />
      },
    },
    {
      key: 'priority',
      label: 'Priorité',
      width: '100px',
      render: (row: Task) => {
        const cfg = TASK_PRIORITY_CONFIG[row.priority]
        // N'affiche priorité haute/urgente uniquement
        if (row.priority === TaskPriority.Basse || row.priority === TaskPriority.Moyenne) return null
        return <Badge label={cfg.label} variant={cfg.variant} dot />
      },
    },
    {
      key: 'status',
      label: 'Statut',
      width: '110px',
      render: (row: Task) => {
        const cfg = TASK_STATUS_CONFIG[row.status]
        return <Badge label={cfg.label} variant={cfg.variant} />
      },
    },
    {
      key: 'due_date',
      label: 'Échéance',
      width: '160px',
      render: (row: Task) => {
        const overdue = isOverdue(row.due_date, row.status)
        const today   = isDueToday(row.due_date)
        if (!row.due_date) return <span className="text-slate-700">—</span>
        return (
          <span className={[
            'flex items-center gap-1.5 text-xs',
            overdue ? 'text-red-400 font-semibold' :
            today   ? 'text-amber-400 font-medium' :
                      'text-slate-500',
          ].join(' ')}>
            {overdue ? <AlertTriangle size={11} /> : <Clock3 size={11} />}
            {formatDate(row.due_date)}
          </span>
        )
      },
    },
    {
      key: 'contact',
      label: 'Lié à',
      width: '160px',
      render: (row: Task) => (
        <div className="space-y-0.5">
          {row.contact && (
            <span className="flex items-center gap-1 text-[11px] text-blue-400">
              <User size={10} />
              {row.contact.first_name} {row.contact.last_name}
            </span>
          )}
          {row.lead && (
            <span className="flex items-center gap-1 text-[11px] text-violet-400 truncate max-w-[140px]">
              <TrendingUp size={10} />
              {row.lead.title}
            </span>
          )}
          {!row.contact && !row.lead && <span className="text-slate-700 text-xs">—</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (row: Task) => (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="xs"
            icon={<Pencil size={11} />}
            onClick={e => { e.stopPropagation(); onEdit(row) }}
            aria-label="Modifier"
          />
          <Button
            variant="danger"
            size="xs"
            icon={<Trash2 size={11} />}
            onClick={e => { e.stopPropagation(); onDelete(row.id) }}
            aria-label="Supprimer"
          />
        </div>
      ),
    },
  ], [onToggle, onEdit, onDelete])

  return (
    <div className="flex flex-col h-full">
      {/* Filtres statut */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 flex-wrap">
        <FilterPill<StatusFilter>
          value="all" current={statusFilter} onChange={setStatusFilter}
          icon={<Circle size={11} />} label="Toutes" count={tasks.length}
          activeClass="bg-slate-800 text-slate-200 border-slate-700"
        />
        <FilterPill<StatusFilter>
          value="a_faire" current={statusFilter} onChange={setStatusFilter}
          icon={<Clock3 size={11} />} label="À faire" count={counts.todo}
          activeClass="bg-blue-950/60 text-blue-400 border-blue-700"
        />
        <FilterPill<StatusFilter>
          value="terminee" current={statusFilter} onChange={setStatusFilter}
          icon={<CheckCircle2 size={11} />} label="Terminées" count={counts.done}
          activeClass="bg-emerald-950/60 text-emerald-400 border-emerald-700"
        />
      </div>

      {/* Filtres urgence */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/30 flex-wrap">
        <FilterPill<UrgencyFilter>
          value="all" current={urgencyFilter} onChange={setUrgencyFilter}
          icon={<CalendarClock size={11} />} label="Tout"
          activeClass="bg-slate-800 text-slate-300 border-slate-700"
        />
        <FilterPill<UrgencyFilter>
          value="overdue" current={urgencyFilter} onChange={setUrgencyFilter}
          icon={<AlertTriangle size={11} />} label="Retard" count={counts.overdue}
          activeClass="bg-red-950/60 text-red-400 border-red-700"
        />
        <FilterPill<UrgencyFilter>
          value="today" current={urgencyFilter} onChange={setUrgencyFilter}
          icon={<CalendarCheck size={11} />} label="Aujourd'hui" count={counts.today}
          activeClass="bg-amber-950/60 text-amber-400 border-amber-700"
        />
        <FilterPill<UrgencyFilter>
          value="upcoming" current={urgencyFilter} onChange={setUrgencyFilter}
          icon={<ChevronRight size={11} />} label="À venir" count={counts.upcoming}
          activeClass="bg-sky-950/60 text-sky-400 border-sky-700"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto [&_table]:border-0 [&_th]:bg-slate-900 [&_th]:text-slate-500 [&_th]:border-b [&_th]:border-slate-800 [&_td]:border-b [&_td]:border-slate-800/50 [&_tr:hover]:bg-slate-900/50 [&_.bg-white]:bg-transparent [&_.rounded-2xl]:rounded-none [&_.shadow-sm]:shadow-none [&_.border-gray-100]:border-0">
        {/* Override DataTable styles to match dark theme */}
        <style>{`
          .task-table-wrap .bg-white { background: transparent !important; }
          .task-table-wrap .bg-gray-50 { background: rgb(15 23 42 / 0.5) !important; }
          .task-table-wrap .border-gray-200 { border-color: rgb(30 41 59) !important; }
          .task-table-wrap .divide-gray-50 > * { border-color: rgb(30 41 59 / 0.5) !important; }
          .task-table-wrap .text-gray-500 { color: rgb(100 116 139) !important; }
          .task-table-wrap .text-gray-700 { color: rgb(203 213 225) !important; }
          .task-table-wrap .text-gray-400 { color: rgb(71 85 105) !important; }
          .task-table-wrap .hover\\:bg-gray-50:hover { background: rgb(30 41 59 / 0.4) !important; }
          .task-table-wrap tr { group: true; }
        `}</style>
        <div className="task-table-wrap">
          <DataTable<Task>
            columns={columns}
            data={filtered}
            loading={loading}
            empty="Aucune tâche ne correspond aux filtres sélectionnés."
          />
        </div>
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <div className="px-5 py-2.5 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-600">
            {filtered.length} tâche{filtered.length > 1 ? 's' : ''}
          </span>
          {counts.overdue > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wide">
              <AlertTriangle size={11} />
              {counts.overdue} en retard
            </span>
          )}
        </div>
      )}
    </div>
  )
}
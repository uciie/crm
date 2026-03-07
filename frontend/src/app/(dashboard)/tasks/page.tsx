// ─────────────────────────────────────────────────────────────────────────────
// app/(crm)/tasks/page.tsx — Page principale Tâches & Calendrier
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  LayoutList, CalendarDays, Plus,
  Clock3, Layers, CheckCircle2, AlertTriangle, Zap,
} from 'lucide-react'
import { Button }           from '@/components/ui/Button'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { ToastContainer }   from '@/components/ui/Toast'
import { CalendarView }     from '@/components/tasks/CalendarView'
import { TaskList }         from '@/components/tasks/TaskList'
import { TaskForm }         from '@/components/tasks/TaskForm'
import { useTasks }         from '@/hooks/useTasks'
import { isOverdue, isDueToday } from '@/lib/task-config'
import { TaskStatus }       from '@/types/index'
import type { Task, TaskFormValues } from '@/types/index'

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, loading, accent,
}: {
  icon:    React.ReactNode
  label:   string
  value:   number
  loading: boolean
  accent:  string
}) {
  if (loading) return <StatCardSkeleton />

  return (
    <article className="bg-slate-900 border border-slate-800 p-5 flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-500 mb-2">
          {label}
        </p>
        <p className={`text-3xl font-bold leading-none ${accent}`}>{value}</p>
      </div>
      <div className={`text-current opacity-30 ${accent}`}>
        {icon}
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Onglets
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'list' | 'calendar'

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav role="tablist" aria-label="Vues du module Tâches" className="flex items-center border border-slate-800">
      {([
        { value: 'list',     label: 'Liste',      Icon: LayoutList   },
        { value: 'calendar', label: 'Calendrier', Icon: CalendarDays },
      ] as const).map(({ value, label, Icon }) => (
        <button
          key={value}
          role="tab"
          aria-selected={active === value}
          onClick={() => onChange(value)}
          className={[
            'flex items-center gap-2 h-9 px-4',
            'text-[10px] font-bold tracking-[0.12em] uppercase',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            active === value
              ? 'bg-slate-800 text-slate-200'
              : 'text-slate-600 hover:text-slate-400',
          ].join(' ')}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tab,      setTab]      = useState<Tab>('list')
  const [formOpen, setFormOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()

  const { tasks, loading, create, update, remove, toggle } = useTasks()

  const stats = useMemo(() => ({
    todo:        tasks.filter(t => t.status === TaskStatus.AFaire).length,
    in_progress: tasks.filter(t => t.status === TaskStatus.EnCours).length,
    done:        tasks.filter(t => t.status === TaskStatus.Terminee).length,
    overdue:     tasks.filter(t => isOverdue(t.due_date, t.status)).length,
    due_soon:    tasks.filter(t => isDueToday(t.due_date) && t.status !== TaskStatus.Terminee).length,
  }), [tasks])

  useEffect(() => {
    const overdue = stats.overdue
    document.title = overdue > 0
      ? `(${overdue}) Tâches & Agenda`
      : 'Tâches & Agenda'
  }, [stats])

  const handleCreate = useCallback(() => {
    setEditTask(undefined)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((task: Task) => {
    setEditTask(task)
    setFormOpen(true)
  }, [])

  const handleFormSubmit = useCallback(async (values: TaskFormValues) => {
    if (editTask) await update(editTask.id, values)
    else          await create(values)
  }, [editTask, create, update])

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Supprimer cette tâche définitivement ?')) {
      await remove(id)
    }
  }, [remove])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">

      {/* ── Header local — titre + bouton créer uniquement ─────────────────── */}
      {/* Refresh et Notifications sont dans le Header global (layout) */}
      <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between px-6 h-14 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-px bg-blue-500" />
            <div>
              <h1 className="text-xs font-bold tracking-[0.18em] uppercase text-slate-200 leading-none">
                Tâches & Agenda
              </h1>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5 hidden sm:block">
                Planification et suivi des activités
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={13} />}
            onClick={handleCreate}
          >
            <span className="hidden sm:inline">Nouvelle tâche</span>
          </Button>
        </div>
      </header>

      {/* ── Contenu ─────────────────────────────────────────────────────────── */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* KPI Cards */}
        <section
          aria-label="Statistiques des tâches"
          className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-slate-800 bg-slate-800"
        >
          <StatCard icon={<Clock3 size={28} />}       label="À faire"    value={stats.todo}        loading={loading} accent="text-blue-400"    />
          <StatCard icon={<Layers size={28} />}        label="En cours"   value={stats.in_progress} loading={loading} accent="text-sky-400"     />
          <StatCard icon={<CheckCircle2 size={28} />}  label="Terminées"  value={stats.done}        loading={loading} accent="text-emerald-400" />
          <StatCard icon={<AlertTriangle size={28} />} label="En retard"  value={stats.overdue}     loading={loading} accent="text-red-400"     />
        </section>

        {/* Panel principal */}
        <div className="bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <TabBar active={tab} onChange={setTab} />
            <div className="flex items-center gap-3">
              {stats.due_soon > 0 && (
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                  <Zap size={11} />
                  {stats.due_soon} à venir
                </span>
              )}
              <span className="text-[10px] text-slate-700 font-medium uppercase tracking-wide hidden sm:block">
                {loading ? '···' : `${tasks.length} tâche${tasks.length > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          <div
            role="tabpanel"
            aria-label={tab === 'list' ? 'Vue liste' : 'Vue calendrier'}
            className="min-h-[520px]"
          >
            {tab === 'list' ? (
              <TaskList
                tasks={tasks}
                loading={loading}
                onToggle={toggle}
                onOpen={handleEdit}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ) : (
              <CalendarView
                tasks={tasks}
                loading={loading}
                onTaskClick={handleEdit}
              />
            )}
          </div>
        </div>
      </main>

      <TaskForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTask(undefined) }}
        onSubmit={handleFormSubmit}
        task={editTask}
      />

      <ToastContainer />
    </div>
  )
}
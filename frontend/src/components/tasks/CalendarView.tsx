// ─────────────────────────────────────────────────────────────────────────────
// components/tasks/CalendarView.tsx — Vue Calendrier Mensuelle / Hebdomadaire
// Utilise : Button, Skeleton du projet · Design dark slate-950
// Responsive : grille desktop → liste quotidienne mobile
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, List, AlertTriangle, Clock } from 'lucide-react'
import { Button }   from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { TASK_TYPE_CONFIG, isOverdue, formatTime, formatDate } from '@/lib/task-config'
import { TaskStatus } from '@/types/index'
import type { Task } from '@/types/index'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DAY_SHORT  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function getFirstDayOfMonth(y: number, m: number): number {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function getWeekDays(date: Date): Date[] {
  const d   = new Date(date)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const c = new Date(d); c.setDate(d.getDate() + i); return c
  })
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks
    .filter(t => t.due_date && sameDay(new Date(t.due_date), date))
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
}

// ─────────────────────────────────────────────────────────────────────────────
// Pastille de tâche
// ─────────────────────────────────────────────────────────────────────────────

function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  const cfg     = TASK_TYPE_CONFIG[task.type]
  const overdue = isOverdue(task.due_date, task.status)
  const done    = task.status === TaskStatus.Terminee

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      title={`${task.title} — ${formatTime(task.due_date)}`}
      style={done ? {} : overdue ? { background: 'rgba(239,68,68,0.1)', color: '#f87171' } : { background: cfg.chipBg, color: cfg.chipText }}
      className={[
        'w-full flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] truncate text-left',
        'uppercase transition-opacity hover:opacity-80',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
        done ? 'line-through opacity-30 bg-slate-800/40 text-slate-600' : '',
      ].join(' ')}
    >
      <span className={`w-1 h-1 rounded-full shrink-0 ${done ? 'bg-slate-600' : overdue ? 'bg-red-500' : cfg.dotClass}`} />
      <span className="truncate">{task.title}</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cellule grille mensuelle
// ─────────────────────────────────────────────────────────────────────────────

function MonthCell({
  date, tasks, isToday, isOtherMonth, isSelected, onClick, onTaskClick,
}: {
  date: Date; tasks: Task[]; isToday: boolean; isOtherMonth: boolean
  isSelected: boolean; onClick: () => void; onTaskClick: (t: Task) => void
}) {
  const visible = tasks.slice(0, 3)
  const extra   = tasks.length - 3

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className={[
        'min-h-[72px] p-1.5 border cursor-pointer transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
        isSelected    ? 'border-blue-600 bg-blue-950/20' :
        isOtherMonth  ? 'border-slate-900 bg-slate-950/30' :
                        'border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/30',
      ].join(' ')}
    >
      <div className="flex justify-end mb-1">
        <span className={[
          'w-5 h-5 flex items-center justify-center text-[11px] font-bold',
          isToday      ? 'bg-blue-600 text-white'   :
          isOtherMonth ? 'text-slate-800'            :
                         'text-slate-400',
        ].join(' ')}>
          {date.getDate()}
        </span>
      </div>
      <div className="space-y-0.5">
        {visible.map(t => <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t)} />)}
        {extra > 0 && (
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wide pl-1 mt-0.5">
            +{extra} autre{extra > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vue semaine (desktop)
// ─────────────────────────────────────────────────────────────────────────────

function WeekView({ weekDays, tasks, today, onTaskClick }: {
  weekDays: Date[]; tasks: Task[]; today: Date; onTaskClick: (t: Task) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-px border border-slate-800 bg-slate-800">
      {weekDays.map((d, i) => {
        const isToday   = sameDay(d, today)
        const dayTasks  = getTasksForDate(tasks, d)
        return (
          <div key={i} className="bg-slate-950">
            {/* Header jour */}
            <div className={`text-center py-3 border-b border-slate-800 ${isToday ? 'bg-blue-950/30' : ''}`}>
              <p className="text-[9px] font-bold tracking-[0.16em] uppercase text-slate-600">{DAY_SHORT[i]}</p>
              <div className={`w-7 h-7 mx-auto mt-1 flex items-center justify-center text-sm font-bold ${isToday ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>
                {d.getDate()}
              </div>
            </div>
            {/* Tâches du jour */}
            <div className="min-h-[100px] p-1.5 space-y-0.5">
              {dayTasks.map(t => <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t)} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Liste quotidienne (mobile + panneau de détail)
// ─────────────────────────────────────────────────────────────────────────────

function DayListView({ date, tasks, onTaskClick }: {
  date: Date; tasks: Task[]; onTaskClick: (t: Task) => void
}) {
  const dayTasks = getTasksForDate(tasks, date)
  const label    = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(date)

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-slate-800" />
        <h3 className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-500 capitalize whitespace-nowrap">{label}</h3>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
      {dayTasks.length === 0 ? (
        <p className="text-xs text-slate-700 text-center py-6 uppercase tracking-widest font-bold">Aucune tâche</p>
      ) : (
        <ul className="space-y-1.5">
          {dayTasks.map(task => {
            const cfg     = TASK_TYPE_CONFIG[task.type]
            const overdue = isOverdue(task.due_date, task.status)
            const done    = task.status === TaskStatus.Terminee
            const Icon    = cfg.Icon
            return (
              <li key={task.id}>
                <button
                  onClick={() => onTaskClick(task)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left border',
                    'transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    overdue && !done
                      ? 'border-red-900/60 bg-red-950/20 hover:bg-red-950/30'
                      : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/60',
                  ].join(' ')}
                >
                  <Icon size={13} style={{ color: done ? '#334155' : cfg.chipText }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${done ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${overdue && !done ? 'text-red-400' : 'text-slate-600'}`}>
                        {overdue && !done ? <AlertTriangle size={9} /> : <Clock size={9} />}
                        {formatTime(task.due_date)}
                      </p>
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide shrink-0" style={{ color: cfg.chipText }}>
                    {cfg.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

type CalMode = 'month' | 'week'

interface CalendarViewProps {
  tasks:       Task[]
  loading:     boolean
  onTaskClick: (task: Task) => void
}

export function CalendarView({ tasks, loading, onTaskClick }: CalendarViewProps) {
  const today    = useMemo(() => new Date(), [])
  const [mode,     setMode]     = useState<CalMode>('month')
  const [current,  setCurrent]  = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(today)

  const year  = current.getFullYear()
  const month = current.getMonth()

  const prev = () => setCurrent(m => {
    if (mode === 'month') return new Date(m.getFullYear(), m.getMonth() - 1, 1)
    const d = new Date(m); d.setDate(d.getDate() - 7); return d
  })
  const next = () => setCurrent(m => {
    if (mode === 'month') return new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const d = new Date(m); d.setDate(d.getDate() + 7); return d
  })
  const goToday = () => { setCurrent(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(today) }

  // Cellules grille mensuelle (6 × 7 = 42)
  const monthCells = useMemo(() => {
    const first = getFirstDayOfMonth(year, month)
    const days  = new Date(year, month + 1, 0).getDate()
    const prev  = new Date(year, month, 0).getDate()
    const cells: { date: Date; other: boolean }[] = []
    for (let i = first - 1; i >= 0; i--) cells.push({ date: new Date(year, month - 1, prev - i),  other: true })
    for (let d = 1; d <= days; d++)       cells.push({ date: new Date(year, month, d),              other: false })
    let d = 1
    while (cells.length < 42)             cells.push({ date: new Date(year, month + 1, d++),        other: true })
    return cells
  }, [year, month])

  const weekDays = useMemo(() => getWeekDays(selected), [selected])

  const navLabel = mode === 'month'
    ? `${MONTH_NAMES[month]} ${year}`
    : (() => {
        const wk = getWeekDays(current)
        const a = wk[0]; const b = wk[6]
        return a.getMonth() === b.getMonth()
          ? `${a.getDate()} – ${b.getDate()} ${MONTH_NAMES[b.getMonth()]} ${b.getFullYear()}`
          : `${a.getDate()} ${MONTH_NAMES[a.getMonth()]} – ${b.getDate()} ${MONTH_NAMES[b.getMonth()]} ${b.getFullYear()}`
      })()

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<ChevronLeft size={13} />} onClick={prev} aria-label="Précédent" />
          <Button variant="ghost"   size="sm" onClick={goToday}>Aujourd'hui</Button>
          <Button variant="outline" size="sm" icon={<ChevronRight size={13} />} onClick={next} aria-label="Suivant" />
          <h2 className="text-xs font-bold tracking-[0.12em] uppercase text-slate-300 ml-2 capitalize">
            {navLabel}
          </h2>
        </div>

        {/* Sélecteur mois / semaine (desktop) */}
        <div className="hidden sm:flex items-center border border-slate-800">
          {(['month', 'week'] as CalMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={[
                'flex items-center gap-1.5 h-8 px-3',
                'text-[10px] font-bold tracking-[0.12em] uppercase',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                mode === m
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-600 hover:text-slate-400',
              ].join(' ')}
            >
              {m === 'month' ? <><LayoutGrid size={12} /> Mois</> : <><List size={12} /> Semaine</>}
            </button>
          ))}
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* MOBILE — liste quotidienne */}
        <div className="sm:hidden">
          {/* Mini strip 14 jours */}
          <div className="flex gap-1 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
            {Array.from({ length: 14 }, (_, i) => {
              const d       = new Date(today); d.setDate(today.getDate() + i - 3)
              const isSel   = sameDay(d, selected)
              const isToday = sameDay(d, today)
              const hasTasks = getTasksForDate(tasks, d).length > 0
              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className={[
                    'flex flex-col items-center py-2 px-2.5 min-w-[44px] shrink-0 border',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    isSel   ? 'bg-blue-600 border-blue-600 text-white' :
                    isToday ? 'border-blue-800 bg-blue-950/30 text-blue-400' :
                              'border-slate-800 bg-slate-900 text-slate-500',
                  ].join(' ')}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide">{DAY_SHORT[(d.getDay() + 6) % 7]}</span>
                  <span className="text-sm font-bold mt-0.5">{d.getDate()}</span>
                  {hasTasks && (
                    <span className={`w-1 h-1 rounded-full mt-1 ${isSel ? 'bg-white/60' : 'bg-blue-500'}`} />
                  )}
                </button>
              )
            })}
          </div>
          {loading
            ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : <DayListView date={selected} tasks={tasks} onTaskClick={onTaskClick} />
          }
        </div>

        {/* DESKTOP */}
        <div className="hidden sm:block">
          {loading ? (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_SHORT.map(d => (
                  <div key={d} className="text-center text-[9px] font-bold tracking-[0.16em] uppercase text-slate-600 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 42 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            </>
          ) : mode === 'month' ? (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_SHORT.map(d => (
                  <div key={d} className="text-center text-[9px] font-bold tracking-[0.16em] uppercase text-slate-600 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthCells.map(({ date, other }, i) => (
                  <MonthCell
                    key={i} date={date}
                    tasks={getTasksForDate(tasks, date)}
                    isToday={sameDay(date, today)}
                    isOtherMonth={other}
                    isSelected={sameDay(date, selected)}
                    onClick={() => setSelected(date)}
                    onTaskClick={onTaskClick}
                  />
                ))}
              </div>
            </>
          ) : (
            <WeekView weekDays={weekDays} tasks={tasks} today={today} onTaskClick={onTaskClick} />
          )}

          {/* Panneau jour sélectionné */}
          {mode === 'month' && (
            <div className="mt-5 border-t border-slate-800 pt-5">
              <DayListView date={selected} tasks={tasks} onTaskClick={onTaskClick} />
            </div>
          )}
        </div>
      </div>

      {/* Légende */}
      <div className="hidden sm:flex items-center gap-5 px-4 py-2.5 border-t border-slate-800">
        {Object.entries(TASK_TYPE_CONFIG).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">
            <span className={`w-1.5 h-1.5 ${cfg.dotClass}`} />
            {cfg.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-red-700">
          <span className="w-1.5 h-1.5 bg-red-500" />
          En retard
        </span>
      </div>
    </div>
  )
}
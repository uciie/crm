// ─────────────────────────────────────────────────────────────────────────────
// components/tasks/NotificationCenter.tsx — Centre de notifications (dropdown)
// Utilise : Badge, Button, Spinner du projet · Design dark slate-950
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useRef, useEffect, useCallback } from 'react'
import {
  Bell, BellOff, CheckCheck, AlertTriangle, Clock,
  ArrowRight, X, ChevronDown,
} from 'lucide-react'
import { Badge }   from '@/components/ui/Badge'
import { Button }  from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TASK_TYPE_CONFIG, formatDate } from '@/lib/task-config'
import { NotificationType } from '@/types/index'
import type { AppNotification } from '@/types/index'
import { useNotifications } from '@/hooks/useTasks'

// ─────────────────────────────────────────────────────────────────────────────
// Config types notification
// ─────────────────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const NOTIF_CONFIG: Record<NotificationType, {
  icon:    React.ElementType
  label:   string
  variant: BadgeVariant
  textClass: string
}> = {
  [NotificationType.Overdue]: {
    icon:      AlertTriangle,
    label:     'En retard',
    variant:   'danger',
    textClass: 'text-red-400',
  },
  [NotificationType.DueSoon]: {
    icon:      Clock,
    label:     'Bientôt',
    variant:   'warning',
    textClass: 'text-amber-400',
  },
  [NotificationType.Reminder]: {
    icon:      Bell,
    label:     'Rappel',
    variant:   'info',
    textClass: 'text-blue-400',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Temps relatif
// ─────────────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)  return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `Il y a ${hrs} h`
  return `Il y a ${Math.floor(hrs / 24)} j`
}

// ─────────────────────────────────────────────────────────────────────────────
// Item
// ─────────────────────────────────────────────────────────────────────────────

function NotificationItem({
  notification, onMarkRead, onNavigate,
}: {
  notification: AppNotification
  onMarkRead:   (id: string) => void
  onNavigate:   (taskId: string) => void
}) {
  const nCfg = NOTIF_CONFIG[notification.type]
  const tCfg = TASK_TYPE_CONFIG[notification.task.type]
  const NIcon = nCfg.icon
  const TIcon = tCfg.Icon

  return (
    <li className={[
      'flex items-start gap-3 px-4 py-3.5 border-b border-slate-800/60 last:border-b-0',
      'transition-colors hover:bg-slate-900/60',
      !notification.read ? 'bg-blue-950/10' : '',
    ].join(' ')}>
      {/* Icône état */}
      <div className={`mt-0.5 shrink-0 ${nCfg.textClass}`}>
        <NIcon size={14} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge label={nCfg.label} variant={nCfg.variant} dot />
          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] ${tCfg.label === 'Rappel' ? 'text-amber-600' : tCfg.label === 'Rendez-vous' ? 'text-blue-600' : tCfg.label === 'Appel' ? 'text-emerald-600' : 'text-slate-600'}`}>
            <TIcon size={10} />
            {tCfg.label}
          </span>
          {!notification.read && (
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" aria-label="Non lu" />
          )}
        </div>

        {/* Titre */}
        <p className="text-xs font-semibold text-slate-300 mt-1.5 truncate">
          {notification.task.title}
        </p>

        {/* Date */}
        {notification.task.due_date && (
          <p className={`text-[10px] mt-0.5 font-medium ${notification.type === NotificationType.Overdue ? 'text-red-500' : 'text-slate-600'}`}>
            {formatDate(notification.task.due_date)}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-slate-700 font-medium uppercase tracking-wide">
            {relativeTime(notification.created_at)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(notification.task.id)}
              className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            >
              Voir
              <ArrowRight size={10} />
            </button>
            <button
              onClick={() => onMarkRead(notification.id)}
              aria-label="Marquer comme lu"
              className="text-slate-700 hover:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-500"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  open:             boolean
  onToggle:         () => void
  onClose:          () => void
  onNavigateToTask: (taskId: string) => void
}

export function NotificationCenter({
  open, onToggle, onClose, onNavigateToTask,
}: NotificationCenterProps) {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications()
  const panelRef = useRef<HTMLDivElement>(null)

  // Ferme au clic extérieur
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  // Escape
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger */}
      <button
        onClick={onToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        className={[
          'relative flex items-center gap-2 h-9 px-3 border',
          'text-[10px] font-bold tracking-[0.12em] uppercase',
          'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          open
            ? 'bg-slate-800 border-slate-700 text-slate-200'
            : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400',
        ].join(' ')}
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <>
            <span className="hidden sm:inline">Alertes</span>
            <span
              className="flex items-center justify-center w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full leading-none"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="dialog"
          aria-label="Centre de notifications"
          className={[
            'absolute right-0 top-full mt-1 z-50',
            'w-80 max-h-[480px] bg-slate-950 border border-slate-800',
            'shadow-2xl shadow-black/70 overflow-hidden flex flex-col',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-px w-4 bg-blue-500" />
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-300">
                Notifications
              </span>
              {unreadCount > 0 && (
                <Badge label={String(unreadCount)} variant="info" dot />
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <CheckCheck size={12} />
                Tout lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <BellOff size={24} className="text-slate-800 mb-3" />
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-slate-600">
                  Aucune notification
                </p>
                <p className="text-[10px] text-slate-700 mt-1">Toutes vos tâches sont à jour.</p>
              </div>
            ) : (
              <ul>
                {notifications.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={markRead}
                    onNavigate={id => { onNavigateToTask(id); onClose() }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
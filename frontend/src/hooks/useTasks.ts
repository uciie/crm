// ─────────────────────────────────────────────────────────────────────────────
// hooks/useTasks.ts — Hooks React avec intégration useToast du projet
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/useToast'
import {
  fetchTasks, fetchTaskStats, fetchNotifications,
  fetchContactOptions, fetchLeadOptions,
  createTask, updateTask, deleteTask, toggleTaskDone,
  markNotificationRead, markAllNotificationsRead,
  type SelectOption,
} from '@/services/tasks.service'
import type { Task, TaskFilters, TaskStats, AppNotification, TaskFormValues } from '../types'
import { TaskStatus } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// useTasks — CRUD + feedback toast
// ─────────────────────────────────────────────────────────────────────────────

export function useTasks(filters: TaskFilters = {}) {
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const { toast } = useToast()

  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTasks(JSON.parse(filterKey))
      setTasks(res.data)
      setTotal(res.pagination.total)
    } catch (e) {
      const msg = (e as Error).message
      setError(msg)
      // FIX — toast(type, title, message?) au lieu de toast({ ... })
      toast('error', 'Erreur de chargement', msg)
    } finally {
      setLoading(false)
    }
  }, [filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const create = useCallback(async (payload: TaskFormValues): Promise<Task> => {
    try {
      const created = await createTask(payload)
      setTasks((prev: Task[]) => [created, ...prev])
      setTotal(t => t + 1)
      toast('success', 'Tâche créée', payload.title)
      return created
    } catch (e) {
      toast('error', 'Création impossible', (e as Error).message)
      throw e
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(async (id: string, payload: Partial<TaskFormValues>): Promise<Task> => {
    try {
      const updated = await updateTask(id, payload)
      setTasks((prev: Task[]) => prev.map((t: Task) => (t.id === id ? updated : t)))
      toast('success', 'Tâche mise à jour')
      return updated
    } catch (e) {
      toast('error', 'Mise à jour impossible', (e as Error).message)
      throw e
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteTask(id)
      setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== id))
      setTotal(t => t - 1)
      toast('success', 'Tâche supprimée')
    } catch (e) {
      toast('error', 'Suppression impossible', (e as Error).message)
      throw e
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async (task: Task): Promise<void> => {
    try {
      const updated = await toggleTaskDone(task)
      setTasks((prev: Task[]) => prev.map((t: Task) => (t.id === task.id ? updated : t)))
      const label = updated.status === TaskStatus.Terminee ? 'marquée terminée' : 'réouverte'
      toast('success', `Tâche ${label}`)
    } catch (e) {
      toast('error', 'Action impossible', (e as Error).message)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { tasks, total, loading, error, refetch: load, create, update, remove, toggle }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTaskStats
// ─────────────────────────────────────────────────────────────────────────────

export function useTaskStats() {
  const [stats,   setStats]   = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTaskStats().then(setStats).finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}

// ─────────────────────────────────────────────────────────────────────────────
// useNotifications — polling 60 s
// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading,       setLoading]       = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev: AppNotification[]) =>
      prev.map((n: AppNotification) => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((prev: AppNotification[]) =>
      prev.map((n: AppNotification) => ({ ...n, read: true }))
    )
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n: AppNotification) => !n.read).length,
    [notifications]
  )

  return { notifications, loading, unreadCount, markRead, markAllRead }
}

// ─────────────────────────────────────────────────────────────────────────────
// useFormOptions
// ─────────────────────────────────────────────────────────────────────────────

export function useFormOptions() {
  const [contacts, setContacts] = useState<SelectOption[]>([])
  const [leads,    setLeads]    = useState<SelectOption[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([fetchContactOptions(), fetchLeadOptions()])
      .then(([c, l]) => { setContacts(c); setLeads(l) })
      .finally(() => setLoading(false))
  }, [])

  return { contacts, leads, loading }
}
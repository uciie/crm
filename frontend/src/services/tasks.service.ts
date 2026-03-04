// ─────────────────────────────────────────────────────────────────────────────
// tasks.service.ts — Couche d'abstraction API (fetch uniquement, sans side-effects UI)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Task, TaskFormValues, TaskFilters,
  TaskStats, AppNotification, PaginatedResponse,
} from '@/types/index'
import { TaskStatus } from '@/types/index'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

function toQS(filters: TaskFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== 'all') p.set(k, String(v))
  })
  return p.toString() ? `?${p.toString()}` : ''
}

// ── Tâches ─────────────────────────────────────────────────────

export async function fetchTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
  return apiFetch<PaginatedResponse<Task>>(`/tasks${toQS(filters)}`)
}

export async function fetchTaskById(id: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`)
}

export async function createTask(payload: TaskFormValues): Promise<Task> {
  return apiFetch<Task>('/tasks', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateTask(id: string, payload: Partial<TaskFormValues>): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export async function deleteTask(id: string): Promise<{ id: string; message: string }> {
  return apiFetch(`/tasks/${id}`, { method: 'DELETE' })
}

export async function toggleTaskDone(task: Task): Promise<Task> {
  const newStatus = task.status === TaskStatus.Terminee ? TaskStatus.AFaire : TaskStatus.Terminee
  return updateTask(task.id, { status: newStatus })
}

// ── Stats ──────────────────────────────────────────────────────

export async function fetchTaskStats(): Promise<TaskStats> {
  return apiFetch<TaskStats>('/tasks/stats')
}

// ── Notifications ──────────────────────────────────────────────

export async function fetchNotifications(): Promise<AppNotification[]> {
  return apiFetch<AppNotification[]>('/notifications')
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  return apiFetch('/notifications/read-all', { method: 'PATCH' })
}

// ── Options pour les selects ───────────────────────────────────

export interface SelectOption { id: string; label: string }

export async function fetchContactOptions(): Promise<SelectOption[]> {
  const res = await apiFetch<{ data: Array<{ id: string; first_name: string; last_name: string }> }>(
    '/contacts?limit=100'
  )
  return res.data.map(c => ({ id: c.id, label: `${c.first_name} ${c.last_name}` }))
}

export async function fetchLeadOptions(): Promise<SelectOption[]> {
  const res = await apiFetch<{ data: Array<{ id: string; title: string }> }>('/leads?limit=100')
  return res.data.map(l => ({ id: l.id, label: l.title }))
}
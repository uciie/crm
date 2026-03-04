// ─────────────────────────────────────────────────────────────────────────────
// tasks.service.ts — Couche d'abstraction API (fetch uniquement, sans side-effects UI)
// ─────────────────────────────────────────────────────────────────────────────
import { api } from '@/lib/api'
import type {
  Task, TaskFormValues, TaskFilters,
  TaskStats, AppNotification, PaginatedResponse,
} from '@/types'
import { TaskStatus } from '@/types'

// Use the shared `api` helper which injects Authorization headers
// and normalises error handling.

function toQS(filters: TaskFilters): string {
  const p = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== 'all') p.set(k, String(v))
  })
  return p.toString() ? `?${p.toString()}` : ''
}

// ── Tâches ─────────────────────────────────────────────────────

export async function fetchTasks(filters: TaskFilters = {}): Promise<PaginatedResponse<Task>> {
  return api.get<PaginatedResponse<Task>>(`/tasks${toQS(filters)}`)
}

export async function fetchTaskById(id: string): Promise<Task> {
  return api.get<Task>(`/tasks/${id}`)
}

export async function createTask(payload: TaskFormValues): Promise<Task> {
  return api.post<Task>('/tasks', payload)
}

export async function updateTask(id: string, payload: Partial<TaskFormValues>): Promise<Task> {
  return api.patch<Task>(`/tasks/${id}`, payload)
}

export async function deleteTask(id: string): Promise<{ id: string; message: string }> {
  return api.delete(`/tasks/${id}`)
}

export async function toggleTaskDone(task: Task): Promise<Task> {
  const newStatus = task.status === TaskStatus.Terminee ? TaskStatus.AFaire : TaskStatus.Terminee
  return updateTask(task.id, { status: newStatus as any })
}

// ── Stats ──────────────────────────────────────────────────────

export async function fetchTaskStats(): Promise<TaskStats> {
  return api.get<TaskStats>('/tasks/stats')
}

// ── Notifications ──────────────────────────────────────────────

// FIX — fallback [] si /notifications n'existe pas encore (route non implémentée).
// Retirer le try/catch une fois le module notifications créé côté NestJS.
export async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    return await api.get<AppNotification[]>('/notifications')
  } catch {
    return []
  }
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  return api.patch<AppNotification>(`/notifications/${id}/read`, {})
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  return api.patch('/notifications/read-all', {})
}

// ── Options pour les selects ───────────────────────────────────

export interface SelectOption { id: string; label: string }

// FIX — fallback [] si /contacts ou /leads retournent 404.
// Ces routes existent probablement mais peuvent nécessiter un préfixe différent.
export async function fetchContactOptions(): Promise<SelectOption[]> {
  try {
    const res = await api.get<{ data: Array<{ id: string; first_name: string; last_name: string }> }>(
      '/contacts?limit=100'
    )
    return res.data.map(c => ({ id: c.id, label: `${c.first_name} ${c.last_name}` }))
  } catch {
    return []
  }
}

export async function fetchLeadOptions(): Promise<SelectOption[]> {
  try {
    const res = await api.get<{ data: Array<{ id: string; title: string }> }>('/leads?limit=100')
    return res.data.map(l => ({ id: l.id, label: l.title }))
  } catch {
    return []
  }
}
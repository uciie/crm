import { createClient } from './supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    // Session invalide : on ne met pas de token, le backend retournera 401
    return { 'Content-Type': 'application/json' }
  }

  // Récupère la session (maintenant fiable car getUser() a validé)
  const { data: { session } } = await supabase.auth.getSession()

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { 'Authorization': `Bearer ${session.access_token}` }
      : {}),
  }
}

export const api = {
  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      headers: await getAuthHeaders(),
    })
    if (res.status === 401) {
      // Redirection automatique si session expirée
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expirée')
    }
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async post<T = any>(path: string, body: any): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    })
    if (res.status === 401) {
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expirée')
    }
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async patch<T = any>(path: string, body: any): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    })
    if (res.status === 401) {
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expirée')
    }
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async delete<T = any>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}
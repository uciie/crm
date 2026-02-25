import { createClient } from './supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    // Pas de session locale — tentative de refresh
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    if (refreshed?.access_token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshed.access_token}`,
      }
    }
    // Toujours pas de session — on laisse le backend retourner 401
    return { 'Content-Type': 'application/json' }
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expirée')
  }
  if (!res.ok) {
    const text = await res.text()
    // Tente de parser le message d'erreur JSON du backend
    try {
      const json = JSON.parse(text)
      throw new Error(json.message ?? json.error ?? text)
    } catch {
      throw new Error(text)
    }
  }
  // Gère les réponses vides (ex: DELETE 204)
  const text = await res.text()
  return text ? JSON.parse(text) : ({} as T)
}

export const api = {
  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      headers: await getAuthHeaders(),
    })
    return handleResponse<T>(res)
  },

  async post<T = any>(path: string, body: any): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method:  'POST',
      headers: await getAuthHeaders(),
      body:    JSON.stringify(body),
    })
    return handleResponse<T>(res)
  },

  async patch<T = any>(path: string, body: any): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method:  'PATCH',
      headers: await getAuthHeaders(),
      body:    JSON.stringify(body),
    })
    return handleResponse<T>(res)
  },

  async delete<T = any>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method:  'DELETE',
      headers: await getAuthHeaders(),
    })
    return handleResponse<T>(res)
  },
}
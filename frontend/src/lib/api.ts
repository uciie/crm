import { createClient } from './supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const supabase = createClient()

// ══════════════════════════════════════════════════════════════
// Lit le token depuis le cookie sb-*-auth-token directement.
// @supabase/ssr stocke le JWT en cookie accessible côté JS
// (pas HttpOnly quand posé par createBrowserClient côté client).
// On essaie d'abord getSession() qui lit ce cookie, puis fallback
// sur une lecture manuelle du cookie en cas d'échec.
// ══════════════════════════════════════════════════════════════
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  // Format du cookie : sb-[project-ref]-auth-token=base64url...
  // Peut être splitté en .0 et .1 si trop long
  const cookies = document.cookie.split(';').map(c => c.trim())

  // Cherche le cookie principal (non splitté)
  const main = cookies.find(c => c.match(/^sb-.+-auth-token=/) && !c.includes('.0') && !c.includes('.1'))
  if (main) {
    try {
      const value = decodeURIComponent(main.split('=').slice(1).join('='))
      const parsed = JSON.parse(value)
      return parsed.access_token ?? null
    } catch {}
  }

  // Cookie splitté en chunks .0 + .1
  const chunk0 = cookies.find(c => c.match(/^sb-.+-auth-token\.0=/))
  const chunk1 = cookies.find(c => c.match(/^sb-.+-auth-token\.1=/))
  if (chunk0) {
    try {
      const raw = decodeURIComponent(chunk0.split('=').slice(1).join('='))
          + (chunk1 ? decodeURIComponent(chunk1.split('=').slice(1).join('=')) : '')
      const parsed = JSON.parse(raw)
      return parsed.access_token ?? null
    } catch {}
  }

  return null
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  
  // 1. On tente via la méthode officielle
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;

  // 2. Fallback : Si Supabase ne voit rien, on cherche manuellement dans les cookies
  if (!token && typeof document !== 'undefined') {
    const name = "sb-" + process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID + "-auth-token";
    const cookie = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    if (cookie) {
      try {
        const val = decodeURIComponent(cookie.split('=')[1]);
        // Supabase stocke parfois le token dans un JSON dans le cookie
        const parsed = JSON.parse(val);
        token = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
      } catch (e) {
        console.error("Erreur parse cookie auth", e);
      }
    }
  }

  if (!token) {
    throw new Error('401: Session expirée ou token invalide');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // NE PAS rediriger ici — le middleware Next.js gère la navigation
    // Une redirection manuelle ici cause la boucle login→dashboard→login
    throw new Error('401: Session expirée ou token invalide')
  }

  if (!res.ok) {
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      throw new Error(json.message ?? json.error ?? text)
    } catch {
      throw new Error(text || `Erreur HTTP ${res.status}`)
    }
  }

  const text = await res.text()
  return text ? JSON.parse(text) : ({} as T)
}

export const api = {
  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      headers: await getAuthHeaders(),
    })
    console.log(`[api] GET ${getAuthHeaders()}`)
    console.log(`[api] GET ${path} - Status: ${res.status}`)

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
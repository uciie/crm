import { createClient } from './supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const supabase = createClient()

// ── Extraction du JWT depuis les cookies Supabase ─────────────
// @supabase/ssr peut nommer le cookie de plusieurs façons :
//   - sb-<ref>-auth-token        → valeur JSON  {"access_token":"eyJ..."}
//   - sb-<ref>-auth-tokenbase64  → valeur "base64-eyJ..." (base64url du JSON)
//   - sb-<ref>-auth-token.0      → chunk 0 si cookie trop long
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null

  const all = document.cookie.split(';').map(c => c.trim())

  // Trouve le premier cookie dont le nom commence par sb- et contient auth-token
  const authCookie = all.find(c => {
    const name = c.split('=')[0].trim()
    return name.startsWith('sb-') && name.includes('auth-token')
  })

  if (!authCookie) {
    console.warn('[api] Cookie sb-*auth-token* introuvable. Noms disponibles:',
      all.map(c => c.split('=')[0].trim()).filter(n => n.startsWith('sb-'))
    )
    return null
  }

  const rawValue = authCookie.split('=').slice(1).join('=').trim()

  // Format 1 : "base64-<base64url>" → décoder le base64
  if (rawValue.startsWith('base64-')) {
    try {
      const b64 = rawValue.slice(7) // retire "base64-"
      const json = atob(b64)
      const parsed = JSON.parse(json)
      if (parsed.access_token) {
        console.log('[api] Token extrait depuis cookie base64')
        return parsed.access_token
      }
    } catch (e) {
      console.error('[api] Erreur décodage base64:', e)
    }
  }

  // Format 2 : URL-encodé → décoder puis parser JSON
  try {
    const decoded = decodeURIComponent(rawValue)
    const parsed  = JSON.parse(decoded)
    if (parsed.access_token) {
      console.log('[api] Token extrait depuis cookie JSON')
      return parsed.access_token
    }
  } catch {}

  // Format 3 : le cookie EST directement le JWT (commence par eyJ)
  if (rawValue.startsWith('eyJ')) {
    console.log('[api] Token extrait directement depuis cookie')
    return rawValue
  }

  console.warn('[api] Cookie trouvé mais format non reconnu. Début:', rawValue.slice(0, 60))
  return null
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const base = { 'Content-Type': 'application/json' }

  // Priorité 1 : lecture directe du cookie (fiable indépendamment du SDK)
  const cookieToken = getTokenFromCookie()
  if (cookieToken) {
    return { ...base, 'Authorization': `Bearer ${cookieToken}` }
  }

  // Priorité 2 : getSession() via le SDK Supabase
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      console.log('[api] Token obtenu via getSession()')
      return { ...base, 'Authorization': `Bearer ${session.access_token}` }
    }
  } catch (e) {
    console.error('[api] getSession() error:', e)
  }

  // Priorité 3 : refresh explicite
  try {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    if (refreshed?.access_token) {
      console.warn('[api] Session rafraîchie')
      return { ...base, 'Authorization': `Bearer ${refreshed.access_token}` }
    }
  } catch (e) {
    console.error('[api] refreshSession() error:', e)
  }

  console.error('[api] Aucun token disponible — requête envoyée sans Authorization')
  return base
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
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
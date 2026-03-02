import { createClient } from '@/lib/supabase/client'
import type { AuthError, User } from '@supabase/supabase-js'

export interface SignInCredentials {
  email:    string
  password: string
}

export interface SignUpCredentials {
  email:    string
  password: string
  fullName: string
}

export interface AuthResult<T = null> {
  data:  T | null
  error: string | null
}

const getClient = () => createClient()

// ── Cooldown simple en mémoire pour éviter les 429 Supabase ──
// Supabase limite à 2 demandes de reset/heure par adresse.
// On bloque les re-soumissions pendant 60s côté client.
const resetCooldowns = new Map<string, number>()
const RESET_COOLDOWN_MS = 60_000

export const authService = {

  async signIn({ email, password }: SignInCredentials): Promise<AuthResult<User>> {
    const supabase = getClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { data: null, error: formatAuthError(error) }
    return { data: data.user, error: null }
  },

  async signUp({ email, password, fullName }: SignUpCredentials): Promise<AuthResult<User>> {
    const supabase = getClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) return { data: null, error: formatAuthError(error) }
    return { data: data.user, error: null }
  },

  async signOut(): Promise<AuthResult> {
    const supabase = getClient()
    const { error } = await supabase.auth.signOut()
    if (error) return { data: null, error: formatAuthError(error) }
    return { data: null, error: null }
  },

  async resetPasswordRequest(email: string): Promise<AuthResult> {
    // Vérification cooldown — évite les doubles soumissions et les 429
    const lastCall = resetCooldowns.get(email)
    if (lastCall && Date.now() - lastCall < RESET_COOLDOWN_MS) {
      const remaining = Math.ceil((RESET_COOLDOWN_MS - (Date.now() - lastCall)) / 1000)
      return {
        data:  null,
        error: `Veuillez patienter ${remaining} secondes avant de renvoyer un email.`,
      }
    }

    const supabase = getClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // FIX : encode la destination dans ?next= pour que le callback
      // sache où rediriger après l'échange du code PKCE.
      // Sans ce paramètre, le callback redirige vers /dashboard
      // car type=recovery n'est jamais injecté par Supabase dans l'URL.
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })

    if (error) return { data: null, error: formatAuthError(error) }

    // Enregistre le timestamp uniquement si l'appel a réussi
    resetCooldowns.set(email, Date.now())
    return { data: null, error: null }
  },

  async updatePassword(newPassword: string): Promise<AuthResult> {
    const supabase = getClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { data: null, error: formatAuthError(error) }
    return { data: null, error: null }
  },

  async getVerifiedUser(): Promise<User | null> {
    const supabase = getClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  },
}

function formatAuthError(error: AuthError): string {
  const map: Record<string, string> = {
    'Invalid login credentials':                 'Identifiants incorrects. Vérifiez votre email et mot de passe.',
    'Email not confirmed':                       'Confirmez votre adresse email avant de vous connecter.',
    'User already registered':                   'Un compte existe déjà avec cet email.',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 8 caractères.',
    'Email rate limit exceeded':                 'Trop de tentatives. Patientez avant de réessayer.',
    // 429 Supabase → message lisible
    'over_email_send_rate_limit':                'Trop de demandes. Attendez quelques minutes avant de réessayer.',
    'Invalid email':                             "Format d'email invalide.",
    'Signup is disabled':                        'Les inscriptions sont désactivées. Contactez un administrateur.',
  }
  return map[error.message] ?? map[error.code as string] ?? 'Une erreur est survenue. Veuillez réessayer.'
}
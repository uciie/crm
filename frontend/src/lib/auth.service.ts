import { createClient } from '@/lib/supabase/client'
import type { AuthError, User } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────

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

// ── Service ──────────────────────────────────────────────────

const getClient = () => createClient()

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
    const supabase = getClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) return { data: null, error: formatAuthError(error) }
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

// ── Error mapping ─────────────────────────────────────────────

function formatAuthError(error: AuthError): string {
  const map: Record<string, string> = {
    'Invalid login credentials':                  'Identifiants incorrects. Verifiez votre email et mot de passe.',
    'Email not confirmed':                        'Confirmez votre adresse email avant de vous connecter.',
    'User already registered':                    'Un compte existe deja avec cet email.',
    'Password should be at least 6 characters':  'Le mot de passe doit contenir au moins 8 caracteres.',
    'Email rate limit exceeded':                  'Trop de tentatives. Patientez avant de reessayer.',
    'Invalid email':                              'Format d\'email invalide.',
    'Signup is disabled':                         'Les inscriptions sont desactivees. Contactez un administrateur.',
  }
  return map[error.message] ?? 'Une erreur est survenue. Veuillez reessayer.'
}
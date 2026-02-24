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
        // ✅ callback Supabase → route API /auth/callback (avec auth/)
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
      // ✅ Supabase envoie l'utilisateur sur /auth/callback?type=recovery
      // Le callback gère ensuite la redirection vers /update-password
      redirectTo: `${window.location.origin}/auth/callback`,
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

function formatAuthError(error: AuthError): string {
  const map: Record<string, string> = {
    'Invalid login credentials':                 'Identifiants incorrects. Vérifiez votre email et mot de passe.',
    'Email not confirmed':                       'Confirmez votre adresse email avant de vous connecter.',
    'User already registered':                   'Un compte existe déjà avec cet email.',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 8 caractères.',
    'Email rate limit exceeded':                 'Trop de tentatives. Patientez avant de réessayer.',
    'Invalid email':                             'Format d\'email invalide.',
    'Signup is disabled':                        'Les inscriptions sont désactivées. Contactez un administrateur.',
  }
  return map[error.message] ?? 'Une erreur est survenue. Veuillez réessayer.'
}
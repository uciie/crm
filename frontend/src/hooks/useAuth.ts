'use client'
// ============================================================
// hooks/useAuth.ts
//
// Lecteur pur du store Zustand.
// Aucun useEffect, aucun onAuthStateChange, aucun état local.
// Peut être appelé dans autant de composants que nécessaire
// sans effet de bord — toujours la même source de vérité.
// ============================================================

import { useRouter }    from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

const supabase = createClient()

export function useAuth() {
  const router = useRouter()

  const user            = useAuthStore(s => s.user)
  const profile         = useAuthStore(s => s.profile)
  const loading         = useAuthStore(s => s.loading)
  const clearAuth       = useAuthStore(s => s.clearAuth)
  const refreshProfile  = useAuthStore(s => s.refreshProfile)

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    router.push('/dashboard')
    router.refresh()
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    clearAuth()
    router.push('/login')
    router.refresh()
  }

  const isAdmin      = profile?.role === 'admin'
  const isCommercial = profile?.role === 'commercial' || isAdmin

  return {
    user,
    profile,
    loading,
    isAdmin,
    isCommercial,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }
}
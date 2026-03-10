'use client'
// ============================================================
// components/auth/AuthProvider.tsx
//
// UN SEUL onAuthStateChange pour toute l'app.
// À placer dans app/layout.tsx (RootLayout), autour de {children}.
//
// Avant : useAuth() créait son propre listener à chaque appel.
// AuthGuard + RoleGate + RoleNavigation = 3 listeners simultanés
// → race condition sur loading → spinner infini.
//
// Après : AuthProvider = 1 listener → store Zustand.
//         useAuth() = lecteur pur du store, sans effet de bord.
// ============================================================

import { useEffect, useRef } from 'react'
import { createClient }      from '@/lib/supabase/client'
import { useAuthStore }      from '@/store/authStore'

const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading, setRefreshProfile } = useAuthStore()
  const mounted = useRef(true)

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!mounted.current) return

    if (error && error.code !== 'PGRST116') {
      console.warn('[AuthProvider] profil introuvable:', error.code, error.message)
    }
    setProfile(data ?? null)
  }

  useEffect(() => {
    mounted.current = true

    // Enregistre refreshProfile dans le store dès le montage
    setRefreshProfile(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && mounted.current) await loadProfile(user.id)
    })

    // Initialisation — vérifie la session courante
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted.current) return
        setUser(user)
        if (user) await loadProfile(user.id)
      } catch (e) {
        console.error('[AuthProvider] init error:', e)
        if (mounted.current) setUser(null)
      } finally {
        if (mounted.current) setLoading(false)
      }
    }

    void init()

    // Listener unique — déclenché par login/logout/token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          await loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        if (event === 'SIGNED_OUT') {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}
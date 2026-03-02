'use client'
// ============================================================
// hooks/useAuth.ts
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { useRouter }                   from 'next/navigation'
import { createClient }                from '@/lib/supabase/client'
import { useAuthStore }                from '@/store/authStore'
import type { User }                   from '@supabase/supabase-js'
import type { Profile }                from '@/types'

const supabase = createClient()

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const router   = useRouter()
  const mounted  = useRef(true)

  // Acces au store Zustand pour la reinitialisation lors du logout
  const clearAuth = useAuthStore(state => state.clearAuth)

  useEffect(() => {
    mounted.current = true

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!mounted.current) return

      if (error && error.code !== 'PGRST116') {
        console.warn('[useAuth] profil introuvable:', error.code, error.message)
      }

      setProfile(data ?? null)
    }

    const init = async () => {
      try {
        const { data: { user: verifiedUser } } = await supabase.auth.getUser()

        if (!mounted.current) return

        setUser(verifiedUser)

        if (verifiedUser) {
          await loadProfile(verifiedUser.id)
        }
      } catch (e) {
        console.error('[useAuth] init error:', e)
        if (mounted.current) setUser(null)
      } finally {
        if (mounted.current) setLoading(false)
      }
    }

    void init()

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

        if (event === 'SIGNED_IN') {
          router.refresh()
        }
      }
    )

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [])

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

    // Reinitialisation du store Zustand — evite un profil perime en cache
    clearAuth()

    router.push('/login')
    router.refresh()
  }

  const isAdmin      = profile?.role === 'admin'
  const isCommercial = profile?.role === 'commercial' || isAdmin

  return { user, profile, loading, isAdmin, isCommercial, signIn, signUp, signOut }
}
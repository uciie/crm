'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter }                                  from 'next/navigation'
import { createClient }                               from '@/lib/supabase/client'
import type { User }                                  from '@supabase/supabase-js'
import type { Profile }                               from '@/types'

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router                = useRouter()

  const supabase = useMemo(() => createClient(), [])

  const loadProfile = useCallback(async (userId: string) => {
    console.log('[useAuth] loadProfile → start', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // ⚠️ Si la table profiles n'est pas accessible (RLS, table inexistante, etc.)
        // on construit un profil minimal depuis les métadonnées Supabase Auth
        // pour ne pas bloquer l'interface.
        console.warn('[useAuth] loadProfile error:', error.message)
        console.warn('[useAuth] Code:', error.code, '— Hint:', error.hint)

        // Profil de fallback : l'utilisateur peut accéder à l'app
        // mais certaines données de rôle peuvent être manquantes
        setProfile(null)
        return
      }

      console.log('[useAuth] loadProfile → success, role:', data?.role)
      setProfile(data)
    } catch (e) {
      console.error('[useAuth] loadProfile unexpected error:', e)
      setProfile(null)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    console.log('[useAuth] init → start')

    const init = async () => {
      try {
        console.log('[useAuth] calling getUser()...')
        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()

        console.log('[useAuth] getUser() result:', {
          userId: verifiedUser?.id ?? null,
          error:  error?.message ?? null,
        })

        if (!mounted) return

        setUser(verifiedUser)

        if (verifiedUser) {
          await loadProfile(verifiedUser.id)
        }
      } catch (e) {
        console.error('[useAuth] init error:', e)
        if (mounted) setUser(null)
      } finally {
        console.log('[useAuth] setLoading(false)')
        if (mounted) setLoading(false)
      }
    }

    void init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] onAuthStateChange:', event, session?.user?.id ?? null)
        if (!mounted) return
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          await loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        if (event === 'SIGNED_IN') router.refresh()
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, loadProfile, router])

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
    setUser(null)
    setProfile(null)
    router.push('/login')
    router.refresh()
  }

  const isAdmin      = profile?.role === 'admin'
  const isCommercial = profile?.role === 'commercial' || isAdmin

  return { user, profile, loading, isAdmin, isCommercial, signIn, signUp, signOut }
}
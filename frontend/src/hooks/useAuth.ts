'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { createClient }        from '@/lib/supabase/client'
import type { User }           from '@supabase/supabase-js'
import type { Profile }        from '@/types'

// Client instancié une seule fois au niveau module — hors de tout composant/hook.
// Cela garantit qu'il n'y a jamais deux instances simultanées,
// même en React Strict Mode (double mount).
const supabase = createClient()

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router                = useRouter()

  useEffect(() => {
    let mounted = true

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('[useAuth] profil introuvable:', error.code, error.message)
      }
      if (mounted) setProfile(data ?? null)
    }

    const init = async () => {
      try {
        const { data: { user: verifiedUser } } = await supabase.auth.getUser()
        if (!mounted) return
        setUser(verifiedUser)
        if (verifiedUser) await loadProfile(verifiedUser.id)
      } catch (e) {
        console.error('[useAuth] init error:', e)
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
  }, [router])

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
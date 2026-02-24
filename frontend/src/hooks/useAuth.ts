'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter }                        from 'next/navigation'
import { createClient }                     from '@/lib/supabase/client'
import type { User }                        from '@supabase/supabase-js'
import type { Profile }                     from '@/types'

// ── Hook ─────────────────────────────────────────────────────

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router                = useRouter()
  const supabase              = createClient()

  // Load profile from Neon via the backend profile endpoint.
  // Kept in useAuth to avoid duplicating the fetch everywhere.
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      // getUser() validates the session server-side (not just local cookie).
      // This is the secure alternative to getSession().
      const { data: { user: verifiedUser } } = await supabase.auth.getUser()
      setUser(verifiedUser)
      if (verifiedUser) await loadProfile(verifiedUser.id)
      setLoading(false)
    }

    void init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          await loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        // After SIGNED_IN from email confirmation redirect
        if (event === 'SIGNED_IN') {
          router.refresh()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile, supabase, router])

  // ── Auth actions ───────────────────────────────────────────

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

  // ── Derived role helpers ───────────────────────────────────

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
  }
}
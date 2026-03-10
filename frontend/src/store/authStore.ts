// store/authStore.ts
// ============================================================
// Source unique de vérité pour l'état auth.
// Étendu avec user + loading pour éviter les instances multiples
// de useAuth() qui créent chacune leur propre état local.
// ============================================================

import { create }       from 'zustand'
import type { User }    from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  user:     User | null
  profile:  Profile | null
  loading:  boolean

  setUser:         (user: User | null)        => void
  setProfile:      (profile: Profile | null)  => void
  setLoading:      (loading: boolean)         => void
  clearAuth:       ()                         => void
  // Injecté par AuthProvider au montage — permet à useAuth de l'exposer
  refreshProfile:  ()                         => Promise<void>
  setRefreshProfile: (fn: () => Promise<void>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user:     null,
  profile:  null,
  loading:  true,

  setUser:    (user)    => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  clearAuth: () => set({ user: null, profile: null, loading: false }),

  refreshProfile:    async () => {},
  setRefreshProfile: (fn)     => set({ refreshProfile: fn }),
}))
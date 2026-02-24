
import { create }       from 'zustand'
import type { Profile } from '@/types'

interface AuthState {
  profile:    Profile | null
  setProfile: (profile: Profile | null) => void
  clearAuth:  () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile:    null,
  setProfile: (profile) => set({ profile }),
  clearAuth:  ()        => set({ profile: null }),
}))

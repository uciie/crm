import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient }  from '@supabase/supabase-js'

// Singleton — une seule instance par session navigateur.
let _client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (_client) return _client

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Désactive le Navigator LockManager qui cause des timeouts
        // quand plusieurs instances Supabase coexistent (React Strict Mode).
        // Le singleton ci-dessus garantit une seule instance,
        // mais on désactive le lock par sécurité.
        lock: async (name, acquireTimeout, fn) => {
          // Exécution directe sans verrou — safe car on a un singleton
          return fn()
        },
      },
    }
  )

  return _client
}
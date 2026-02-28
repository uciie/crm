import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (_client) return _client

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Force le nom standard sans suffixe base64
        name: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!
          .replace('https://', '')
          .replace('.supabase.co', '')
          .split('.')[0]}-auth-token`,
      },
      cookies: {
        // Lecture explicite du cookie — contourne le bug de nommage
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const cookies = document.cookie.split(';')
          // Cherche d'abord le nom exact, puis tout cookie sb-*auth-token*
          const exact = cookies.find(c => c.trim().startsWith(`${name}=`))
          if (exact) return decodeURIComponent(exact.split('=').slice(1).join('='))
          const fuzzy = cookies.find(c => {
            const n = c.trim().split('=')[0]
            return n.startsWith('sb-') && n.includes('auth-token')
          })
          if (fuzzy) return decodeURIComponent(fuzzy.split('=').slice(1).join('='))
          return undefined
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          let cookie = `${name}=${encodeURIComponent(value)}`
          if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`
          if (options?.path)   cookie += `; Path=${options.path ?? '/'}`
          document.cookie = cookie
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; Max-Age=0; Path=${options?.path ?? '/'}`
        },
      },
    }
  )
  return _client
}
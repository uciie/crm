import { NextResponse }                from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Handles redirects from Supabase after:
// - Email confirmation (signup)     → redirects to /dashboard
// - Password reset link click       → redirects to /update-password
//
// Architecture des URLs :
//   /auth/callback      → route API  (src/app/auth/callback/route.ts)
//   /forgot-password    → page auth  (src/app/(auth)/forgot-password/page.tsx)
//   /update-password    → page auth  (src/app/(auth)/update-password/page.tsx)
//   /login, /register   → pages auth (src/app/(auth)/...)
//
// Le groupe (auth) ne génère PAS de segment /auth/ dans l'URL.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code                     = searchParams.get('code')
  const type                     = searchParams.get('type')
  const next                     = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Réinitialisation de mot de passe → /update-password (groupe (auth), pas /auth/)
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/update-password`)
      }
      // Confirmation email (signup) → dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
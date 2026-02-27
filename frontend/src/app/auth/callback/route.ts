// app/auth/callback/route.ts
// ══════════════════════════════════════════════════════════════
// Ce fichier est CRITIQUE avec @supabase/ssr.
//
// Supabase redirige ici après login/signup/reset avec un ?code=...
// dans l'URL. Ce handler échange ce code contre un access_token +
// refresh_token, puis les pose en COOKIES via le serveur Next.js.
//
// Sans ce fichier → pas de cookies sb-* → middleware voit user=null
// → redirige vers /login → boucle infinie.
// ══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { NextResponse }       from 'next/server'
import { cookies }            from 'next/headers'
import type { NextRequest }   from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code        = searchParams.get('code')
  const type        = searchParams.get('type')       // 'recovery', 'signup', etc.
  const redirectTo  = searchParams.get('redirectTo') ?? '/dashboard'
  const next        = searchParams.get('next')       ?? redirectTo

  if (!code) {
    // Pas de code → erreur Supabase ou lien expiré
    console.error('[auth/callback] Aucun code reçu dans l\'URL')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // Échange le code PKCE contre une session complète
  // → Supabase pose automatiquement les cookies sb-* via setAll()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // Redirection après reset de mot de passe
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/update-password`)
  }

  // Redirection normale après login/signup
  return NextResponse.redirect(`${origin}${next}`)
}
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
//
// FIX reset password :
// L'ancienne version lisait searchParams.get('type') pour détecter
// un flow recovery. Supabase n'injecte PAS type=recovery dans l'URL
// de redirection PKCE — seul ?code=XXX est ajouté.
// Résultat : type était toujours null, la condition échouait, et
// l'utilisateur atterrissait sur /dashboard.
//
// Solution : auth.service.ts encode la destination dans ?next= :
//   redirectTo: `${origin}/auth/callback?next=/update-password`
// Supabase concatène &code=XXX → le callback lit `next` directement.
// ══════════════════════════════════════════════════════════════

import { createServerClient } from '@supabase/ssr'
import { NextResponse }       from 'next/server'
import { cookies }            from 'next/headers'
import type { NextRequest }   from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  // `next` est encodé par notre service dans le redirectTo.
  // Fallback sur /dashboard pour les autres flows (signup, etc.)
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
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
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, any> }>) {
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

  // Redirection vers la destination demandée (ex: /update-password ou /dashboard)
  return NextResponse.redirect(`${origin}${next}`)
}
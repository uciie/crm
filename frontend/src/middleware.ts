import { createServerClient }        from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'

// ── Routes publiques (sans authentification) ──────────────────
// ⚠️ Le groupe (auth) ne génère PAS de préfixe /auth/ dans les URLs.
//    Donc les pages auth sont à /login, /register, /forgot-password, /update-password
//    La seule route avec /auth/ dans l'URL est le callback API Supabase.

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth/callback',       // ← route API (src/app/auth/callback/route.ts)
  '/forgot-password',     // ← page (src/app/(auth)/forgot-password/page.tsx)
  '/update-password',     // ← page (src/app/(auth)/update-password/page.tsx)
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname   = request.nextUrl.pathname
  const isPublic   = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const isAuthPage = ['/login', '/register'].some(p => pathname.startsWith(p))

  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
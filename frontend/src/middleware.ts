import { createServerClient }        from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'

// ── Routes publiques (sans authentification) ──────────────────

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/update-password',
]

// ── Middleware ────────────────────────────────────────────────

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

  // getUser() valide le JWT côté serveur (seule méthode sécurisée en middleware)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname   = request.nextUrl.pathname
  const isPublic   = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const isAuthPage = ['/login', '/register'].some(p => pathname.startsWith(p))

  // Utilisateur non authentifié → route protégée
  if (!user && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Utilisateur authentifié → page de login/register inutile
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
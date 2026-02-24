import { NextResponse }                from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Handles redirects from Supabase after:
// - Email confirmation (signup)
// - Password reset link click
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code                     = searchParams.get('code')
  const next                     = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Password reset: redirect to update-password page
      const type = searchParams.get('type')
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }
      // Email confirmation: redirect to dashboard (or next param)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
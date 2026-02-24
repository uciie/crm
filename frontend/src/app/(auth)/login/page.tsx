'use client'

import { useState }      from 'react'
import { useForm }       from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { useRouter }     from 'next/navigation'
import Link              from 'next/link'
import { AuthLayout }    from '@/components/auth/AuthLayout'
import {
  AuthInput,
  PasswordInput,
  AuthButton,
  AuthAlert,
}                        from '@/components/auth/AuthUI'
import {
  signInSchema,
  type SignInFormData,
}                        from '@/lib/auth.schemas'
import { authService }   from '@/lib/auth.service'

export default function LoginPage() {
  const router                        = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInFormData) => {
    setServerError(null)
    const { error } = await authService.signIn(data)
    if (error) {
      setServerError(error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accès à votre espace de travail CRM."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && <AuthAlert type="error" message={serverError} />}

        <AuthInput
          label="Adresse email"
          type="email"
          placeholder="nom@entreprise.com"
          autoComplete="email"
          autoFocus
          {...register('email')}
          error={errors.email?.message}
        />

        <div className="space-y-2">
          <PasswordInput
            label="Mot de passe"
            placeholder="Votre mot de passe"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className="flex justify-end">
            {/* ✅ CORRECTION : /auth/forgot-password (avec dossier auth/) */}
            <Link
              href="/auth/forgot-password"
              className="text-[11px] text-slate-600 hover:text-blue-400 transition-colors tracking-wide"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <div className="pt-1">
          <AuthButton type="submit" loading={isSubmitting}>
            Se connecter
          </AuthButton>
        </div>

        <p className="text-center text-xs text-slate-700">
          Pas encore de compte ?{' '}
          <Link
            href="/register"
            className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
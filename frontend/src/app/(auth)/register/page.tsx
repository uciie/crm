'use client'

import { useState }        from 'react'
import { useForm }         from 'react-hook-form'
import { zodResolver }     from '@hookform/resolvers/zod'
import Link                from 'next/link'
import { AuthLayout }      from '@/components/auth/AuthLayout'
import {
  AuthInput,
  PasswordInput,
  AuthButton,
  AuthAlert,
  PasswordStrength,
  AuthDivider,
}                          from '@/components/auth/AuthUI'
import {
  signUpSchema,
  type SignUpFormData,
}                          from '@/lib/auth.schemas'
import { authService }     from '@/lib/auth.service'

// ── Page ─────────────────────────────────────────────────────

export default function RegisterPage() {
  const [serverError, setServerError]   = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const passwordValue = watch('password', '')

  const onSubmit = async (data: SignUpFormData) => {
    setServerError(null)
    const { error } = await authService.signUp({
      email:    data.email,
      password: data.password,
      fullName: data.fullName,
    })
    if (error) {
      setServerError(error)
      return
    }
    setSuccessEmail(data.email)
  }

  // ── Success state ────────────────────────────────────────

  if (successEmail) {
    return (
      <AuthLayout
        title="Verification requise"
        subtitle="Votre compte a ete cree avec succes."
        backHref="/login"
        backLabel="Retour a la connexion"
      >
        <div className="space-y-6">
          <AuthAlert
            type="success"
            message={`Un email de confirmation a ete envoye a ${successEmail}.`}
          />

          <div className="border border-slate-800 p-5 space-y-3">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600">
              Etapes suivantes
            </p>
            <ol className="space-y-3">
              {[
                'Verifiez votre boite de reception (et vos spams)',
                'Cliquez sur le lien de confirmation',
                'Connectez-vous avec vos identifiants',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="text-[10px] font-mono font-bold text-blue-500 mt-0.5 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // ── Form ─────────────────────────────────────────────────

  return (
    <AuthLayout
      title="Creer un compte"
      subtitle="Rejoignez votre equipe sur CRM Pro."
      backHref="/login"
      backLabel="Retour a la connexion"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {serverError && <AuthAlert type="error" message={serverError} />}

        <AuthInput
          label="Nom complet"
          type="text"
          placeholder="Marie Dupont"
          autoComplete="name"
          autoFocus
          {...register('fullName')}
          error={errors.fullName?.message}
        />

        <AuthInput
          label="Adresse email"
          type="email"
          placeholder="nom@entreprise.com"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />

        <AuthDivider label="Securite du compte" />

        <div className="space-y-3">
          <PasswordInput
            label="Mot de passe"
            placeholder="8 caracteres minimum"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <PasswordStrength password={passwordValue} />
        </div>

        <PasswordInput
          label="Confirmer le mot de passe"
          placeholder="Repetez le mot de passe"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <div className="pt-1">
          <AuthButton type="submit" loading={isSubmitting}>
            Creer mon compte
          </AuthButton>
        </div>

        <p className="text-center text-xs text-slate-700">
          Deja un compte ?{' '}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Se connecter
          </Link>
        </p>

      </form>
    </AuthLayout>
  )
}
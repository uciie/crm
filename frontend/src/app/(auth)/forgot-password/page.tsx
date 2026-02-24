'use client'

import { useState }      from 'react'
import { useForm }       from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { AuthLayout }    from '@/components/auth/AuthLayout'
import {
  AuthInput,
  AuthButton,
  AuthAlert,
}                        from '@/components/auth/AuthUI'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
}                        from '@/lib/auth.schemas'
import { authService }   from '@/lib/auth.service'

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sentEmail, setSentEmail]     = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null)
    const { error } = await authService.resetPasswordRequest(data.email)
    if (error) {
      setServerError(error)
      return
    }
    setSentEmail(data.email)
  }

  if (sentEmail) {
    return (
      <AuthLayout
        title="Email envoyé"
        backHref="/login"
        backLabel="Retour à la connexion"
      >
        <div className="space-y-5">
          <AuthAlert
            type="success"
            message={`Un lien de réinitialisation a été envoyé à ${sentEmail}.`}
          />
          <div className="border border-slate-800 p-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              Vérifiez votre boîte de réception et vos spams. Le lien est valable{' '}
              <span className="text-slate-200 font-semibold">60 minutes</span>.
            </p>
          </div>
          <p className="text-center text-xs text-slate-700">
            Email non reçu ?{' '}
            <button
              type="button"
              onClick={() => { setSentEmail(null); setServerError(null) }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Renvoyer
            </button>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Entrez votre email pour recevoir un lien de réinitialisation."
      backHref="/login"
      backLabel="Retour à la connexion"
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

        <div className="pt-1">
          <AuthButton type="submit" loading={isSubmitting}>
            Envoyer le lien
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  )
}
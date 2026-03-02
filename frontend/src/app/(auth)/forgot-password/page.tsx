'use client'

import { useState, useEffect } from 'react'
import { useForm }             from 'react-hook-form'
import { zodResolver }         from '@hookform/resolvers/zod'
import { Mail }                from 'lucide-react'
import { AuthLayout }          from '@/components/auth/AuthLayout'
import {
  AuthInput,
  AuthButton,
  AuthAlert,
}                              from '@/components/auth/AuthUI'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
}                              from '@/lib/auth.schemas'
import { authService }         from '@/lib/auth.service'

const COOLDOWN_SECONDS = 60

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sentEmail, setSentEmail]     = useState<string | null>(null)
  // Compteur de cooldown — bloque le bouton "Renvoyer" pendant 60s
  const [cooldown, setCooldown]       = useState(0)

  // Décremente le compteur chaque seconde
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

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
    setCooldown(COOLDOWN_SECONDS)
  }

  // ── Écran de confirmation ─────────────────────────────────

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

          {/* Bouton renvoyer avec cooldown visible */}
          <p className="text-center text-xs text-slate-700">
            Email non reçu ?{' '}
            {cooldown > 0 ? (
              <span className="text-slate-600">
                Renvoyer dans{' '}
                <span className="font-mono text-slate-400">{cooldown}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSentEmail(null)
                  setServerError(null)
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Renvoyer
              </button>
            )}
          </p>
        </div>
      </AuthLayout>
    )
  }

  // ── Formulaire ────────────────────────────────────────────

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
          icon={Mail}
          type="email"
          placeholder="nom@entreprise.com"
          autoComplete="email"
          autoFocus
          {...register('email')}
          error={errors.email?.message}
        />

        <div className="pt-1">
          <AuthButton type="submit" loading={isSubmitting} disabled={cooldown > 0}>
            {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : 'Envoyer le lien'}
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  )
}
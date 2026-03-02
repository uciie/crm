'use client'

import { useState }      from 'react'
import { useForm }       from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { useRouter }     from 'next/navigation'
import { Lock, KeyRound } from 'lucide-react'
import { AuthLayout }    from '@/components/auth/AuthLayout'
import {
  PasswordInput,
  AuthButton,
  AuthAlert,
  PasswordStrength,
}                        from '@/components/auth/AuthUI'
import {
  updatePasswordSchema,
  type UpdatePasswordFormData,
}                        from '@/lib/auth.schemas'
import { authService }   from '@/lib/auth.service'

export default function UpdatePasswordPage() {
  const router                        = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  })

  const passwordValue = watch('password', '')

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setServerError(null)
    const { error } = await authService.updatePassword(data.password)
    if (error) {
      setServerError(error)
      return
    }
    router.push('/login?message=password-updated')
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe sécurisé pour votre compte."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {serverError && <AuthAlert type="error" message={serverError} />}

        <div className="space-y-3">
          {/* Prop icon={Lock} — necessite AuthUI.tsx etendu */}
          <PasswordInput
            label="Nouveau mot de passe"
            icon={Lock}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            autoFocus
            {...register('password')}
            error={errors.password?.message}
          />
          <PasswordStrength password={passwordValue} />
        </div>

        {/* Prop icon={KeyRound} — confirmation du mot de passe */}
        <PasswordInput
          label="Confirmer le mot de passe"
          icon={KeyRound}
          placeholder="Répétez le mot de passe"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <div className="pt-1">
          <AuthButton type="submit" loading={isSubmitting}>
            Enregistrer le mot de passe
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  )
}
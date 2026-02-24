import { z } from 'zod'

// ── Login ─────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide'),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis'),
})

// ── Register ──────────────────────────────────────────────────

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Minimum 2 caracteres')
      .max(100, 'Maximum 100 caracteres')
      .regex(/^[a-zA-ZÀ-ÿ\s'\-]+$/, 'Lettres uniquement'),
    email: z
      .string()
      .min(1, 'L\'email est requis')
      .email('Format d\'email invalide'),
    password: z
      .string()
      .min(8, 'Minimum 8 caracteres')
      .regex(/[A-Z]/, 'Au moins une majuscule')
      .regex(/[0-9]/, 'Au moins un chiffre'),
    confirmPassword: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

// ── Forgot Password ───────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide'),
})

// ── Update Password ───────────────────────────────────────────

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Minimum 8 caracteres')
      .regex(/[A-Z]/, 'Au moins une majuscule')
      .regex(/[0-9]/, 'Au moins un chiffre'),
    confirmPassword: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

// ── Inferred types ────────────────────────────────────────────

export type SignInFormData        = z.infer<typeof signInSchema>
export type SignUpFormData        = z.infer<typeof signUpSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>
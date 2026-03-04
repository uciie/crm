// ============================================================
// frontend/src/app/(auth)/forgot-password/page.test.tsx
// Tests React — ForgotPasswordPage
// Convention : Given-When-Then
// ============================================================

import React                             from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent                         from '@testing-library/user-event'

// ── Mocks communs ─────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter:  () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

jest.mock('@/lib/auth.service', () => ({
  authService: {
    resetPasswordRequest: jest.fn(),
    updatePassword:       jest.fn(),
  },
}))

jest.mock('@/components/auth/AuthLayout', () => ({
  AuthLayout: ({ children, title }: any) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}))

jest.mock('@/components/auth/AuthUI', () => ({
  AuthInput: React.forwardRef<HTMLInputElement, any>(
    ({ label, type = 'text', error, ...rest }, ref) => (
      <div>
        <label htmlFor={label}>{label}</label>
        <input ref={ref} id={label} type={type} aria-label={label} {...rest} />
        {error && <span role="alert">{error}</span>}
      </div>
    )
  ),
  PasswordInput: React.forwardRef<HTMLInputElement, any>(
    ({ label, error, ...rest }, ref) => (
      <div>
        <label htmlFor={label}>{label}</label>
        <input ref={ref} id={label} type="password" aria-label={label} {...rest} />
        {error && <span role="alert">{error}</span>}
      </div>
    )
  ),
  AuthButton: ({ children, loading, disabled, ...rest }: any) => (
    <button {...rest} disabled={disabled || loading}>
      {loading ? 'Chargement...' : children}
    </button>
  ),
  AuthAlert: ({ type, message }: any) => (
    <div role="alert" data-type={type}>{message}</div>
  ),
  PasswordStrength: ({ password }: any) => (
    <div data-testid="password-strength" />
  ),
}))

import { authService } from '@/lib/auth.service'
const mockResetPasswordRequest = authService.resetPasswordRequest as jest.MockedFunction<
  typeof authService.resetPasswordRequest
>
const mockUpdatePassword = authService.updatePassword as jest.MockedFunction<
  typeof authService.updatePassword
>

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD PAGE
// ─────────────────────────────────────────────────────────────

import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ── Rendu du formulaire ─────────────────────────────────────

  describe('affichage initial', () => {
    it('devrait afficher le champ email et le bouton d envoi', () => {
      // Given / When
      render(<ForgotPasswordPage />)

      // Then
      expect(screen.getByRole('textbox', { name: /adresse email/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /envoyer/i })).toBeInTheDocument()
    })
  })

  // ── Succès de la demande ────────────────────────────────────

  describe('envoi d un email de réinitialisation', () => {
    it('devrait afficher un message de confirmation si l email existe', async () => {
      // Given
      jest.useRealTimers()
      mockResetPasswordRequest.mockResolvedValueOnce({ data: null, error: null })
      render(<ForgotPasswordPage />)

      // When
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'alice@crm.io'
      )
      await userEvent.click(screen.getByRole('button', { name: /envoyer/i }))

      // Then — message de succès affiché
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.some(a => a.getAttribute('data-type') === 'success')).toBe(true)
      })
    })

    it('devrait appeler resetPasswordRequest avec l email saisi', async () => {
      // Given
      jest.useRealTimers()
      mockResetPasswordRequest.mockResolvedValueOnce({ data: null, error: null })
      render(<ForgotPasswordPage />)

      // When
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'bob@crm.io'
      )
      await userEvent.click(screen.getByRole('button', { name: /envoyer/i }))

      // Then
      await waitFor(() => {
        expect(mockResetPasswordRequest).toHaveBeenCalledWith('bob@crm.io')
      })
    })
  })

  // ── Décompte anti-spam (cooldown) ──────────────────────────

  describe('timer de décompte anti-spam', () => {
    it('devrait désactiver le bouton pendant le décompte de 60 secondes', async () => {
      // Given — succès de la première demande
      jest.useRealTimers()
      mockResetPasswordRequest.mockResolvedValueOnce({ data: null, error: null })
      render(<ForgotPasswordPage />)

      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'cooldown@crm.io'
      )
      await userEvent.click(screen.getByRole('button', { name: /envoyer/i }))

      // When — le succès est affiché et le décompte apparaît
      await waitFor(() => {
        // Le texte de décompte est visible (puisque cooldown > 0)
        expect(screen.getByText(/renvoyer dans/i)).toBeInTheDocument()
      })

      // Then — le compteur est visible (vérifier le span monospace qui contient le nombre)
      const mono = document.querySelector('.font-mono')
      expect(mono).not.toBeNull()
      expect(mono?.textContent).toMatch(/\d+/)
      // il n y a pas de bouton 'Renvoyer' actif pendant le cooldown
      expect(screen.queryByRole('button', { name: /renvoyer/i })).not.toBeInTheDocument()
    })
  })

  // ── Erreur serveur ──────────────────────────────────────────

  describe('erreur serveur (429 / autre)', () => {
    it('devrait afficher un message d erreur si la requête échoue', async () => {
      // Given
      jest.useRealTimers()
      mockResetPasswordRequest.mockResolvedValueOnce({
        data:  null,
        error: 'Trop de tentatives. Réessayez dans une heure.',
      })
      render(<ForgotPasswordPage />)

      // When
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'spam@crm.io'
      )
      await userEvent.click(screen.getByRole('button', { name: /envoyer/i }))

      // Then
      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveAttribute('data-type', 'error')
        expect(alert).toHaveTextContent(/tentatives/i)
      })
    })
  })

  // ── Validation Zod ──────────────────────────────────────────

  describe('validation de l email', () => {
    it('devrait rejeter un email mal formé sans appeler l API', async () => {
      // Given
      jest.useRealTimers()
      render(<ForgotPasswordPage />)

      // When
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'pasCorrect'
      )
      await userEvent.click(screen.getByRole('button', { name: /envoyer/i }))

      // Then — l API n est pas appelée
      await waitFor(() => {
        expect(mockResetPasswordRequest).not.toHaveBeenCalled()
      })
    })
  })
})

// ============================================================
// frontend/src/app/(auth)/update-password/page.test.tsx
// Tests React — UpdatePasswordPage
// Convention : Given-When-Then
// ============================================================

// ─────────────────────────────────────────────────────────────
// UPDATE PASSWORD PAGE
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}))

jest.mock('@/lib/auth.service', () => ({
  authService: {
    updatePassword: jest.fn(),
  },
}))

jest.mock('@/components/auth/AuthLayout', () => ({
  AuthLayout: ({ children, title }: any) => (
    <div><h1>{title}</h1>{children}</div>
  ),
}))

jest.mock('@/components/auth/AuthUI', () => ({
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
    <button {...rest} disabled={disabled || loading}>{loading ? 'Chargement...' : children}</button>
  ),
  AuthAlert: ({ type, message }: any) => (<div role="alert" data-type={type}>{message}</div>),
  PasswordStrength: () => (<div data-testid="password-strength" />),
}))

import UpdatePasswordPage from '@/app/(auth)/update-password/page'
import { authService } from '@/lib/auth.service'

const mockUpdatePassword = authService.updatePassword as jest.MockedFunction<
  typeof authService.updatePassword
>

describe('UpdatePasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Rendu du formulaire ─────────────────────────────────────

  describe('affichage initial', () => {
    it('devrait afficher les champs de saisie du nouveau mot de passe', () => {
      // Given / When
      render(<UpdatePasswordPage />)

      // Then
      expect(screen.getByLabelText(/^nouveau mot de passe$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirmer/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /mettre à jour/i })).toBeInTheDocument()
    })
  })

  // ── Validation du mot de passe ──────────────────────────────

  describe('validation des règles de complexité', () => {
    it('devrait afficher une erreur si le mot de passe est trop court', async () => {
      // Given
      render(<UpdatePasswordPage />)

      // When — saisie trop courte
      await userEvent.type(screen.getByLabelText(/^nouveau mot de passe$/i), 'Ab1')
      await userEvent.type(screen.getByLabelText(/confirmer/i), 'Ab1')
      await userEvent.click(screen.getByRole('button', { name: /mettre à jour/i }))

      // Then
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.some(a => a.textContent?.includes('8'))).toBe(true)
      })
    })

    it('devrait afficher une erreur si les mots de passe ne correspondent pas', async () => {
      // Given
      render(<UpdatePasswordPage />)

      // When
      await userEvent.type(screen.getByLabelText(/^nouveau mot de passe$/i), 'Password1')
      await userEvent.type(screen.getByLabelText(/confirmer/i), 'Different1')
      await userEvent.click(screen.getByRole('button', { name: /mettre à jour/i }))

      // Then
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.some(a =>
          a.textContent?.includes('correspondent') || a.textContent?.includes('identiques')
        )).toBe(true)
      })
    })
  })

  // ── Mise à jour réussie ─────────────────────────────────────

  describe('mise à jour réussie', () => {
    it('devrait afficher un message de succès et appeler updatePassword', async () => {
      // Given
      mockUpdatePassword.mockResolvedValueOnce({ data: null, error: null })
      render(<UpdatePasswordPage />)

      // When
      await userEvent.type(screen.getByLabelText(/^nouveau mot de passe$/i), 'NewPass9!')
      await userEvent.type(screen.getByLabelText(/confirmer/i), 'NewPass9!')
      await userEvent.click(screen.getByRole('button', { name: /mettre à jour/i }))

      // Then
      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalledWith('NewPass9!')
        expect(mockPush).toHaveBeenCalledWith('/login?message=password-updated')
      })
    })
  })

  // ── Erreur serveur ──────────────────────────────────────────

  describe('erreur lors de la mise à jour', () => {
    it('devrait afficher le message d erreur retourné par le service', async () => {
      // Given
      mockUpdatePassword.mockResolvedValueOnce({
        data:  null,
        error: 'Le lien de réinitialisation a expiré.',
      })
      render(<UpdatePasswordPage />)

      // When
      await userEvent.type(screen.getByLabelText(/^nouveau mot de passe$/i), 'ValidPass1')
      await userEvent.type(screen.getByLabelText(/confirmer/i), 'ValidPass1')
      await userEvent.click(screen.getByRole('button', { name: /mettre à jour/i }))

      // Then
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const err = alerts.find(a => a.getAttribute('data-type') === 'error')
        expect(err).toBeDefined()
        expect(err).toHaveTextContent(/expiré/i)
      })
    })
  })
})
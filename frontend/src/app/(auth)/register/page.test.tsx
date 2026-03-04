// ============================================================
// frontend/src/app/(auth)/register/page.test.tsx
// Tests React — RegisterPage (SignUp)
// Convention : Given-When-Then
// ============================================================

import React                                          from 'react'
import { render, screen, waitFor }                   from '@testing-library/react'
import userEvent                                     from '@testing-library/user-event'
import RegisterPage                                  from '@/app/(auth)/register/page'

// ── Mocks ─────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/lib/auth.service', () => ({
  authService: {
    signUp: jest.fn(),
  },
}))

jest.mock('@/components/auth/AuthLayout', () => ({
  AuthLayout: ({ children, title }: any) => (
    <div data-testid="auth-layout"><h1>{title}</h1>{children}</div>
  ),
}))

jest.mock('@/components/auth/AuthUI', () => ({
  AuthInput: React.forwardRef<HTMLInputElement, any>(
    ({ label, type = 'text', error, ...rest }, ref) => (
      <div>
        <label htmlFor={label}>{label}</label>
        <input ref={ref} id={label} type={type} aria-label={label} {...rest} />
        {error && <span role="alert" data-testid={`error-${label}`}>{error}</span>}
      </div>
    )
  ),
  PasswordInput: React.forwardRef<HTMLInputElement, any>(
    ({ label, error, ...rest }, ref) => (
      <div>
        <label htmlFor={label}>{label}</label>
        <input ref={ref} id={label} type="password" aria-label={label} {...rest} />
        {error && <span role="alert" data-testid={`error-${label}`}>{error}</span>}
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
    <div data-testid="password-strength" data-password={password} />
  ),
  AuthDivider: ({ label }: any) => <hr aria-label={label} />,
}))

import { authService } from '@/lib/auth.service'
const mockSignUp = authService.signUp as jest.MockedFunction<typeof authService.signUp>

// ── Helpers ───────────────────────────────────────────────────

async function fillAndSubmit({
  fullName  = 'Jean Dupont',
  email     = 'jean@crm.io',
  password  = 'Password1',
  confirm   = 'Password1',
}: {
  fullName?: string
  email?:    string
  password?: string
  confirm?:  string
} = {}) {
  await userEvent.type(screen.getByLabelText(/nom complet/i), fullName)
  await userEvent.type(screen.getByLabelText(/adresse email/i), email)
  await userEvent.type(screen.getByLabelText(/^mot de passe$/i), password)
  await userEvent.type(screen.getByLabelText(/confirmer le mot de passe/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))
}

// ─────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    render(<RegisterPage />)
  })

  // ── Rendu initial ───────────────────────────────────────────

  describe('affichage du formulaire', () => {
    it('devrait afficher les champs obligatoires', () => {
      // Given / When — rendu dans beforeEach

      // Then
      expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument()
    })

    it('devrait afficher le bouton de création de compte', () => {
      // Then
      expect(screen.getByRole('button', { name: /créer mon compte/i })).toBeInTheDocument()
    })
  })

  // ── Règles de complexité du mot de passe ────────────────────

  describe('validation Zod — règles de complexité du mot de passe', () => {
    it('devrait rejeter un mot de passe de moins de 8 caractères', async () => {
      // Given — mot de passe trop court
      // When
      await fillAndSubmit({ password: 'Abc1', confirm: 'Abc1' })

      // Then — erreur de longueur minimale
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const lengthError = alerts.find(a => a.textContent?.includes('8'))
        expect(lengthError).toBeDefined()
      })
    })

    it('devrait rejeter un mot de passe sans majuscule', async () => {
      // Given — tout en minuscules
      // When
      await fillAndSubmit({ password: 'password1', confirm: 'password1' })

      // Then — erreur de majuscule requise
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const caseError = alerts.find(a =>
          a.textContent?.toLowerCase().includes('majuscule')
        )
        expect(caseError).toBeDefined()
      })
    })

    it('devrait rejeter un mot de passe sans chiffre', async () => {
      // Given — pas de chiffre
      // When
      await fillAndSubmit({ password: 'PasswordABC', confirm: 'PasswordABC' })

      // Then — erreur de chiffre requis
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const digitError = alerts.find(a =>
          a.textContent?.toLowerCase().includes('chiffre')
        )
        expect(digitError).toBeDefined()
      })
    })

    it('devrait accepter un mot de passe respectant toutes les règles', async () => {
      // Given — mot de passe valide : >= 8 car., 1 majuscule, 1 chiffre
      mockSignUp.mockResolvedValueOnce({ data: null, error: null })

      // When
      await fillAndSubmit({ password: 'Password1', confirm: 'Password1' })

      // Then — le service est appelé (pas de blocage de validation)
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled()
      })
    })

    it('devrait afficher une erreur si les mots de passe ne correspondent pas', async () => {
      // Given
      // When
      await fillAndSubmit({ password: 'Password1', confirm: 'Password2' })

      // Then
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const matchError = alerts.find(a =>
          a.textContent?.includes('correspondent pas') ||
          a.textContent?.includes('identiques') ||
          a.textContent?.includes('correspondent')
        )
        expect(matchError).toBeDefined()
      })
    })
  })

  // ── Inscription réussie ─────────────────────────────────────

  describe('inscription réussie', () => {
    it('devrait afficher l écran de confirmation après une inscription réussie', async () => {
      // Given — l API accepte l inscription
      mockSignUp.mockResolvedValueOnce({ data: null, error: null })

      // When
      await fillAndSubmit({
        fullName: 'Alice Dupont',
        email:    'alice@crm.io',
        password: 'Secure123',
        confirm:  'Secure123',
      })

      // Then — le message de confirmation est affiché
      await waitFor(() => {
        expect(screen.getByText(/email de confirmation/i)).toBeInTheDocument()
      })
    })

    it('devrait appeler authService.signUp avec les données correctes', async () => {
      // Given
      mockSignUp.mockResolvedValueOnce({ data: null, error: null })

      // When
      await fillAndSubmit({
        fullName: 'Bob Martin',
        email:    'bob@crm.io',
        password: 'BobPass9',
        confirm:  'BobPass9',
      })

      // Then — paramètres transmis correctement
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email:    'bob@crm.io',
            fullName: 'Bob Martin',
            password: 'BobPass9',
          })
        )
      })
    })
  })

  // ── Erreur serveur ──────────────────────────────────────────

  describe('erreur serveur lors de l inscription', () => {
    it('devrait afficher un message d erreur si l email est déjà pris', async () => {
      // Given
      mockSignUp.mockResolvedValueOnce({
        data:  null,
        error: 'Un compte existe déjà avec cet email.',
      })

      // When
      await fillAndSubmit({ email: 'existing@crm.io' })

      // Then
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.some(a => /existe déjà/i.test(a.textContent || ''))).toBe(true)
      })
    })
  })

  // ── Indicateur de robustesse ────────────────────────────────

  describe('indicateur de robustesse du mot de passe', () => {
    it('devrait afficher le composant PasswordStrength', () => {
      // Then — le composant de force de mot de passe est rendu
      expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    })
  })
})
// ============================================================
// frontend/test/app/(auth)/login/page.test.tsx
// Tests React — LoginPage
// Convention : Given-When-Then
// ============================================================

import React                           from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent                       from '@testing-library/user-event'
import LoginPage                       from '@/app/(auth)/login/page'

// ── Mocks ─────────────────────────────────────────────────────

const mockPush    = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock('@/lib/auth.service', () => ({
  authService: {
    signIn: jest.fn(),
  },
}))

jest.mock('@/components/auth/AuthLayout', () => ({
  AuthLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="auth-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

jest.mock('@/components/auth/AuthUI', () => ({
  AuthInput: React.forwardRef<HTMLInputElement, any>(
    ({ label, type, error, ...rest }, ref) => (
      <div>
        <label>{label}</label>
        <input ref={ref} type={type} aria-label={label} {...rest} />
        {error && <span role="alert" data-testid={`error-${label}`}>{error}</span>}
      </div>
    )
  ),
  PasswordInput: React.forwardRef<HTMLInputElement, any>(
    ({ label, error, ...rest }, ref) => (
      <div>
        <label>{label}</label>
        <input ref={ref} type="password" aria-label={label} {...rest} />
        {error && <span role="alert" data-testid={`error-${label}`}>{error}</span>}
      </div>
    )
  ),
  AuthButton: ({ children, loading, disabled, ...rest }: any) => (
    <button {...rest} disabled={disabled || loading}>
      {loading ? 'Chargement...' : children}
    </button>
  ),
  AuthAlert: ({ type, message }: { type: string; message: string }) => (
    <div role="alert" data-type={type}>{message}</div>
  ),
}))

import { authService } from '@/lib/auth.service'
const mockSignIn = authService.signIn as jest.MockedFunction<typeof authService.signIn>

// ─────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Rendu du formulaire ─────────────────────────────────────

  describe('affichage initial du formulaire', () => {
    it('devrait afficher les champs email et mot de passe', () => {
      // Given / When
      render(<LoginPage />)

      // Then — les deux champs sont visibles
      expect(screen.getByRole('textbox', { name: /adresse email/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
    })

    it('devrait afficher le bouton de soumission "Se connecter"', () => {
      // Given / When
      render(<LoginPage />)

      // Then
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
    })

    it('devrait afficher un lien vers la page "Mot de passe oublié"', () => {
      // Given / When
      render(<LoginPage />)

      // Then
      expect(screen.getByRole('link', { name: /mot de passe oublié/i })).toBeInTheDocument()
    })
  })

  // ── Validation Zod — email ──────────────────────────────────

  describe('validation du champ email', () => {
    it('devrait afficher un message d erreur si l email est mal formé', async () => {
      // Given — utilisateur saisit un email invalide
      render(<LoginPage />)
      const emailInput = screen.getByRole('textbox', { name: /adresse email/i })
      const submitBtn  = screen.getByRole('button', { name: /se connecter/i })

      // When — saisie d un email invalide puis soumission
      await userEvent.type(emailInput, 'email-invalide-sans-arobase')
      await userEvent.click(submitBtn)

      // Then — message d erreur de validation Zod
      await waitFor(() => {
        expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
      })
    })

    it('devrait afficher un message d erreur si l email est vide', async () => {
      // Given
      render(<LoginPage />)
      const submitBtn = screen.getByRole('button', { name: /se connecter/i })

      // When — soumission sans remplir l email
      await userEvent.click(submitBtn)

      // Then
      await waitFor(() => {
        expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
      })
    })

    it('ne devrait pas afficher d erreur pour un email correctement formaté', async () => {
      // Given
      render(<LoginPage />)
      mockSignIn.mockResolvedValueOnce({ data: null, error: 'Identifiants incorrects.' })

      const emailInput    = screen.getByRole('textbox', { name: /adresse email/i })
      const passwordInput = screen.getByLabelText(/mot de passe/i)
      const submitBtn     = screen.getByRole('button', { name: /se connecter/i })

      // When — email valide + mot de passe puis soumission
      await userEvent.type(emailInput,    'user@crm.io')
      await userEvent.type(passwordInput, 'Password123')
      await userEvent.click(submitBtn)

      // Then — pas d erreur de format email (seule une erreur serveur peut apparaître)
      await waitFor(() => {
        const alerts = screen.queryAllByRole('alert')
        const formatErrors = alerts.filter(a =>
          a.textContent?.includes('email') && a.textContent?.includes('invalide')
        )
        expect(formatErrors).toHaveLength(0)
      })
    })
  })

  // ── Connexion réussie ───────────────────────────────────────

  describe('connexion réussie', () => {
    it('devrait rediriger vers /dashboard après une authentification réussie', async () => {
      // Given — l API retourne un succès
      mockSignIn.mockResolvedValueOnce({ data: null, error: null })
      render(<LoginPage />)

      // When — saisie des identifiants valides et soumission
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'admin@crm.io'
      )
      await userEvent.type(
        screen.getByLabelText(/mot de passe/i),
        'Password123!'
      )
      await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))

      // Then — redirection vers le tableau de bord
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('devrait appeler authService.signIn avec les bons paramètres', async () => {
      // Given
      mockSignIn.mockResolvedValueOnce({ data: null, error: null })
      render(<LoginPage />)

      // When
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'test@crm.io'
      )
      await userEvent.type(
        screen.getByLabelText(/mot de passe/i),
        'Secret123'
      )
      await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))

      // Then — le service est appelé avec l email et le mot de passe corrects
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email:    'test@crm.io',
          password: 'Secret123',
        })
      })
    })
  })

  // ── Erreur serveur ──────────────────────────────────────────

  describe('erreur de connexion', () => {
    it('devrait afficher le message d erreur retourné par le service', async () => {
      // Given — identifiants incorrects
      mockSignIn.mockResolvedValueOnce({
        data:  null,
        error: 'Identifiants incorrects. Vérifiez votre email et mot de passe.',
      })
      render(<LoginPage />)

      // When
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'wrong@crm.io'
      )
      await userEvent.type(
        screen.getByLabelText(/mot de passe/i),
        'Wrongpass1'
      )
      await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))

      // Then — le message d erreur apparaît
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/identifiants incorrects/i)
      })

      // Et — pas de redirection
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('ne devrait pas rediriger en cas d erreur serveur', async () => {
      // Given
      mockSignIn.mockResolvedValueOnce({ data: null, error: 'Compte désactivé.' })
      render(<LoginPage />)

      // When
      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'inactive@crm.io'
      )
      await userEvent.type(screen.getByLabelText(/mot de passe/i), 'Pass123!')
      await userEvent.click(screen.getByRole('button', { name: /se connecter/i }))

      // Then — aucune redirection
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })

  // ── Etat de chargement ──────────────────────────────────────

  describe('état de chargement', () => {
    it('devrait désactiver le bouton pendant la soumission', async () => {
      // Given — l API tarde à répondre
      mockSignIn.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 200))
      )
      render(<LoginPage />)

      await userEvent.type(
        screen.getByRole('textbox', { name: /adresse email/i }),
        'slow@crm.io'
      )
      await userEvent.type(screen.getByLabelText(/mot de passe/i), 'Slow1234')

      // When — soumission en cours
      const submitBtn = screen.getByRole('button', { name: /se connecter/i })
      fireEvent.click(submitBtn)

      // Then — le bouton est désactivé
      await waitFor(() => {
        expect(submitBtn).toBeDisabled()
      })
    })
  })
})
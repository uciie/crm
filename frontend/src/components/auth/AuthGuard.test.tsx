// ============================================================
// frontend/src/components/auth/AuthGuard.test.tsx
// Tests React — AuthGuard + RoleNavigation
// Convention : Given-When-Then
// ============================================================

import React                    from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent                from '@testing-library/user-event'

// ── Mocks navigation ──────────────────────────────────────────

const mockReplace = jest.fn()
const mockPush    = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter:  () => ({ replace: mockReplace, push: mockPush, refresh: mockRefresh }),
  usePathname: jest.fn(() => '/dashboard'),
  redirect:   jest.fn(),
}))

jest.mock('next/link', () =>
  // eslint-disable-next-line react/display-name
  React.forwardRef(({ href, children, className }: any, ref: any) => (
    <a ref={ref} href={href} className={className}>{children}</a>
  ))
)

// ── Mock useAuth ──────────────────────────────────────────────

const mockUseAuth = jest.fn()
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))

// ── Mock cn util ──────────────────────────────────────────────

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

// ── Import du composant ───────────────────────────────────────

import { AuthGuard, RoleNavigation } from './AuthGuard'
import { LogOut }                    from 'lucide-react'

// ── Profils de test ───────────────────────────────────────────

const ADMIN_PROFILE = {
  id: 'uuid-a', full_name: 'Alice Admin', role: 'admin' as const,
  avatar_url: null, phone: null, is_active: true,
  created_at: '', updated_at: '',
}

const COMMERCIAL_PROFILE = {
  id: 'uuid-c', full_name: 'Bob Commercial', role: 'commercial' as const,
  avatar_url: null, phone: null, is_active: true,
  created_at: '', updated_at: '',
}

const USER_PROFILE = {
  id: 'uuid-u', full_name: 'Carole Utilisateur', role: 'utilisateur' as const,
  avatar_url: null, phone: null, is_active: true,
  created_at: '', updated_at: '',
}

// ─────────────────────────────────────────────────────────────

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Chargement ──────────────────────────────────────────────

  describe('état de chargement', () => {
    it('devrait afficher un écran de chargement tant que la session est vérifiée', () => {
      // Given — authentification en cours
      mockUseAuth.mockReturnValue({ user: null, profile: null, loading: true })

      // When
      render(
        <AuthGuard>
          <div data-testid="protected-content">Contenu protégé</div>
        </AuthGuard>
      )

      // Then — le contenu protégé n est pas visible
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      // L écran de chargement est visible
      expect(screen.getByText(/vérification/i)).toBeInTheDocument()
    })
  })

  // ── Utilisateur non authentifié ─────────────────────────────

  describe('utilisateur non authentifié', () => {
    it('devrait rediriger vers /login quand aucun utilisateur n est connecté', async () => {
      // Given — pas d utilisateur, chargement terminé
      mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })

      // When
      render(
        <AuthGuard>
          <div data-testid="protected-content">Contenu protégé</div>
        </AuthGuard>
      )

      // Then — redirection vers /login
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login')
      })

      // Et — le contenu protégé n est pas rendu
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('ne devrait pas afficher le contenu enfant pour un utilisateur anonyme', () => {
      // Given
      mockUseAuth.mockReturnValue({ user: null, profile: null, loading: false })

      // When
      render(
        <AuthGuard>
          <div data-testid="secret">Données confidentielles</div>
        </AuthGuard>
      )

      // Then
      expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
      expect(screen.queryByText('Données confidentielles')).not.toBeInTheDocument()
    })
  })

  // ── Utilisateur authentifié ─────────────────────────────────

  describe('utilisateur authentifié', () => {
    it('devrait afficher le contenu enfant pour un utilisateur connecté', async () => {
      // Given — admin connecté, chargement terminé
      mockUseAuth.mockReturnValue({
        user:    { id: ADMIN_PROFILE.id },
        profile: ADMIN_PROFILE,
        loading: false,
      })

      // When
      render(
        <AuthGuard>
          <div data-testid="protected-content">Tableau de bord</div>
        </AuthGuard>
      )

      // Then — le contenu est visible
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
    })

    it('ne devrait pas rediriger un utilisateur authentifié', async () => {
      // Given
      mockUseAuth.mockReturnValue({
        user:    { id: COMMERCIAL_PROFILE.id },
        profile: COMMERCIAL_PROFILE,
        loading: false,
      })

      // When
      render(
        <AuthGuard>
          <div>Leads</div>
        </AuthGuard>
      )

      // Then — pas de redirection
      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled()
      })
    })
  })

  // ── Restriction par rôle ────────────────────────────────────

  describe('requiredRole', () => {
    it('devrait rediriger un commercial vers /dashboard s il accède à une page admin', async () => {
      // Given — commercial tente d accéder à une page réservée aux admins
      mockUseAuth.mockReturnValue({
        user:    { id: COMMERCIAL_PROFILE.id },
        profile: COMMERCIAL_PROFILE,
        loading: false,
      })

      // When
      render(
        <AuthGuard requiredRole="admin">
          <div data-testid="admin-content">Gestion utilisateurs</div>
        </AuthGuard>
      )

      // Then — redirection vers le dashboard
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard')
      })
      expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
    })

    it('devrait autoriser un admin à accéder à n importe quelle page', async () => {
      // Given — admin accède à une page requiredRole = "commercial"
      mockUseAuth.mockReturnValue({
        user:    { id: ADMIN_PROFILE.id },
        profile: ADMIN_PROFILE,
        loading: false,
      })

      // When
      render(
        <AuthGuard requiredRole="commercial">
          <div data-testid="commercial-content">Pipeline</div>
        </AuthGuard>
      )

      // Then — accès autorisé pour l admin
      expect(screen.getByTestId('commercial-content')).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────

describe('RoleNavigation', () => {
  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function renderNav(profile: typeof ADMIN_PROFILE | typeof COMMERCIAL_PROFILE | typeof USER_PROFILE) {
    mockUseAuth.mockReturnValue({
      user:     { id: profile.id },
      profile,
      loading:  false,
      signOut:  mockSignOut,
      isAdmin:  profile.role === 'admin',
      isCommercial: ['admin', 'commercial'].includes(profile.role),
    })
    return render(<RoleNavigation />)
  }

  // ── Visibilité des liens "Paramètres" ───────────────────────

  describe('visibilité du lien Paramètres (admin only)', () => {
    it('devrait afficher le lien Paramètres pour un admin', () => {
      // Given / When
      renderNav(ADMIN_PROFILE)

      // Then — le lien vers /settings est visible
      const settingsLink = screen.getByRole('link', { name: /param/i })
      expect(settingsLink).toBeInTheDocument()
    })

    it('devrait masquer le lien Paramètres pour un commercial', () => {
      // Given / When
      renderNav(COMMERCIAL_PROFILE)

      // Then — pas de lien vers les paramètres
      const settingsLinks = screen.queryAllByRole('link', { name: /param/i })
      expect(settingsLinks).toHaveLength(0)
    })

    it('devrait masquer le lien Paramètres pour un utilisateur simple', () => {
      // Given / When
      renderNav(USER_PROFILE)

      // Then
      const settingsLinks = screen.queryAllByRole('link', { name: /param/i })
      expect(settingsLinks).toHaveLength(0)
    })
  })

  // ── Visibilité des liens Pipeline et Leads ──────────────────

  describe('visibilité des liens Pipeline et Leads', () => {
    it('devrait afficher Pipeline et Leads pour un admin', () => {
      // Given / When
      renderNav(ADMIN_PROFILE)

      // Then
      expect(screen.getByRole('link', { name: /pipeline/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /leads/i })).toBeInTheDocument()
    })

    it('devrait afficher Pipeline et Leads pour un commercial', () => {
      // Given / When
      renderNav(COMMERCIAL_PROFILE)

      // Then
      expect(screen.getByRole('link', { name: /pipeline/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /leads/i })).toBeInTheDocument()
    })

    it('devrait masquer Pipeline et Leads pour un utilisateur simple', () => {
      // Given / When
      renderNav(USER_PROFILE)

      // Then — ces liens ne sont pas accessibles aux utilisateurs simples
      expect(screen.queryByRole('link', { name: /pipeline/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /leads/i })).not.toBeInTheDocument()
    })
  })

  // ── Bouton de déconnexion (icône LogOut Lucide) ─────────────

  describe('bouton de déconnexion', () => {
    it('devrait afficher le bouton de déconnexion avec l icône LogOut', () => {
      // Given / When
      renderNav(ADMIN_PROFILE)

      // Then — bouton avec aria-label de déconnexion
      const logoutBtn = screen.getByRole('button', { name: /déconnect/i })
      expect(logoutBtn).toBeInTheDocument()
    })

    it('devrait appeler la fonction signOut au clic sur le bouton de déconnexion', async () => {
      // Given
      renderNav(COMMERCIAL_PROFILE)
      const logoutBtn = screen.getByRole('button', { name: /déconnect/i })

      // When — clic sur l icône de déconnexion
      await userEvent.click(logoutBtn)

      // Then — signOut est déclenché
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })

    it('ne devrait pas déclencher signOut si le bouton n est pas cliqué', () => {
      // Given / When
      renderNav(USER_PROFILE)

      // Then — pas d appel spontané
      expect(mockSignOut).not.toHaveBeenCalled()
    })
  })

  // ── Affichage du nom de l utilisateur ──────────────────────

  describe('affichage du profil utilisateur', () => {
    it('devrait afficher le nom complet de l utilisateur dans la barre latérale', () => {
      // Given / When
      renderNav(ADMIN_PROFILE)

      // Then
      expect(screen.getByText(ADMIN_PROFILE.full_name)).toBeInTheDocument()
    })

    it('devrait afficher le rôle sous forme lisible', () => {
      // Given / When
      renderNav(COMMERCIAL_PROFILE)

      // Then — le libellé "Commercial" est visible dans la pastille de rôle
      expect(screen.getByText(/commercial/i, { selector: 'span' })).toBeInTheDocument()
    })
  })
})
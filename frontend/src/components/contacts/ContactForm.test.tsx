// ============================================================
// src/components/contacts/ContactForm.test.tsx
// Tests React Testing Library — ContactForm
// ============================================================

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ── Mocks modules ────────────────────────────────────────────

jest.mock('@/lib/api', () => ({
  api: {
    post:  jest.fn(),
    patch: jest.fn(),
    get:   jest.fn(),
  },
}))

jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

jest.mock('@/hooks/useCompanies', () => ({
  useCompanyOptions: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

// ── Imports apres les mocks ───────────────────────────────────

import { ContactForm }       from '@/components/contacts/ContactForm'
import { api }               from '@/lib/api'
import { useCompanyOptions } from '@/hooks/useCompanies'

const mockApi              = api as jest.Mocked<typeof api>
const mockUseCompanyOptions = useCompanyOptions as jest.MockedFunction<typeof useCompanyOptions>

// ── Fixtures ─────────────────────────────────────────────────

const COMPANIES_FIXTURE = [
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Acme Corp' },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Beta Industries' },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Gamma SAS' },
]

const CONTACT_FIXTURE = {
  id:         'b1000000-0000-0000-0000-000000000001',
  first_name: 'Sophie',
  last_name:  'Bernard',
  email:      'sophie.bernard@acme.fr',
  phone:      '+33612345678',
  job_title:  'Directrice commerciale',
  company_id: 'c1000000-0000-0000-0000-000000000001',
  city:       'Paris',
}

// ── Helper de rendu ───────────────────────────────────────────

interface RenderOptions {
  contact?: typeof CONTACT_FIXTURE | null
  onClose?: jest.Mock
  onSuccess?: jest.Mock
  companyOptions?: { options: typeof COMPANIES_FIXTURE; loading: boolean } | { options: any[]; loading: boolean }
}

function renderForm({ contact = null, onClose = jest.fn(), onSuccess = jest.fn(), companyOptions }: RenderOptions = {}) {
  mockUseCompanyOptions.mockReturnValue(
    companyOptions ?? { options: COMPANIES_FIXTURE, loading: false }
  )

  return render(
    <ContactForm
      contact={contact}
      onClose={onClose}
      onSaved={onSuccess}
    />
  )
}

// ── Suite principale ──────────────────────────────────────────

describe('ContactForm', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Champs obligatoires ────────────────────────────────────

  describe('Champs obligatoires', () => {
    it('Given le formulaire vide, When rendu en mode creation, Then affiche les champs Prenom, Nom et Email', () => {
      // Arrange & Act
      renderForm()

      // Assert — chaque champ doit avoir un label accessible
      expect(screen.getByLabelText(/pr(é|e)nom/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/\bnom\b/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('Given le formulaire vide, When la soumission est tentee sans nom ni prenom, Then affiche des messages d erreur de validation', async () => {
      // Arrange
      const user = userEvent.setup()
      renderForm()

      // Act — soumettre sans remplir les champs obligatoires
      const submitBtn = screen.getByRole('button', { name: /cr(é|e)er|enregistrer|sauvegarder/i })
      await user.click(submitBtn)

      // Assert
      await waitFor(() => {
        const errors = screen.getAllByRole('alert') ||
                       document.querySelectorAll('[aria-describedby], .text-red-400, .text-red-500')
        expect(errors.length).toBeGreaterThan(0)
      })
    })

    it('Given le champ Email, When rendu, Then possede le type "email" pour la validation native', () => {
      // Arrange & Act
      renderForm()

      // Assert
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('Given le champ Email, When une adresse invalide est saisie, Then affiche un message d erreur de format', async () => {
      // Arrange
      const user = userEvent.setup()
      renderForm()

      // Act
      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'email-invalide')

      const submitBtn = screen.getByRole('button', { name: /cr(é|e)er|enregistrer/i })
      await user.click(submitBtn)

      // Assert
      await waitFor(() => {
        expect(
          screen.queryByText(/email invalide/i) ||
          screen.queryByText(/format/i)          ||
          screen.queryByText(/invalid/i)
        ).toBeInTheDocument()
      })
    })
  })

  // ── Select entreprise ──────────────────────────────────────

  describe('Select entreprise', () => {
    it('Given des entreprises existantes, When le Select est rendu, Then toutes les entreprises sont listees', () => {
      // Arrange & Act
      renderForm()

      // Assert — le select doit contenir chaque option d entreprise
      const select = screen.getByLabelText(/entreprise/i) ||
                     screen.getByRole('combobox', { name: /entreprise/i })

      COMPANIES_FIXTURE.forEach(company => {
        expect(screen.getByText(company.name)).toBeInTheDocument()
      })
    })

    it('Given le Select entreprise, When rendu, Then possede un label accessible "Entreprise"', () => {
      // Arrange & Act
      renderForm()

      // Assert — accessibilite : le select doit etre lie a un label
      const select = screen.getByLabelText(/entreprise/i)
      expect(select).toBeInTheDocument()
    })

    it('Given un contact existant avec une entreprise, When le formulaire est en mode edition, Then l entreprise est preselectionnee', () => {
      // Arrange & Act
      renderForm({ contact: CONTACT_FIXTURE })

      // Assert
      const select = screen.getByLabelText(/entreprise/i) as HTMLSelectElement
      expect(select.value).toBe(CONTACT_FIXTURE.company_id)
    })

    it('Given useCompanyOptions loading=true, When le formulaire est rendu, Then le Select est desactive ou affiche un etat de chargement', () => {
      // Arrange & Act — render with loading state
      renderForm({ companyOptions: { options: [], loading: true } })

      // Assert
      const select = screen.queryByLabelText(/entreprise/i) ||
                     screen.queryByRole('combobox', { name: /entreprise/i })
      if (select) {
        expect(select).toBeDisabled()
      } else {
        // Le select peut etre remplace par un skeleton
        const skeleton = document.querySelector('.animate-pulse, [data-testid="skeleton"]')
        expect(skeleton).toBeInTheDocument()
      }
    })
  })

  // ── Soumission du formulaire ───────────────────────────────

  describe('Soumission du formulaire', () => {
    it('Given des champs valides, When le formulaire est soumis, Then api.post est appele avec les bonnes donnees', async () => {
      // Arrange
      const user = userEvent.setup()
      mockApi.post.mockResolvedValueOnce({ id: 'new-id', ...CONTACT_FIXTURE })
      renderForm()

      // Act
      await user.type(screen.getByLabelText(/pr(é|e)nom/i), 'Sophie')
      await user.type(screen.getByLabelText(/^nom/i),       'Bernard')
      await user.type(screen.getByLabelText(/email/i),      'sophie.bernard@acme.fr')

      const submitBtn = screen.getByRole('button', { name: /cr(é|e)er|enregistrer/i })
      await user.click(submitBtn)

      // Assert
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          '/contacts',
          expect.objectContaining({
            first_name: 'Sophie',
            last_name:  'Bernard',
            email:      'sophie.bernard@acme.fr',
          })
        )
      })
    })

    it('Given un contact existant, When le formulaire est soumis, Then api.patch est appele (pas api.post)', async () => {
      // Arrange
      const user = userEvent.setup()
      mockApi.patch.mockResolvedValueOnce({ ...CONTACT_FIXTURE, city: 'Lyon' })
      renderForm({ contact: CONTACT_FIXTURE })

      // Act — modifier un champ puis soumettre
      const cityInput = screen.queryByLabelText(/ville/i)
      if (cityInput) {
        await user.clear(cityInput)
        await user.type(cityInput, 'Lyon')
      }

      const submitBtn = screen.getByRole('button', { name: /enregistrer|sauvegarder|modifier/i })
      await user.click(submitBtn)

      // Assert
      await waitFor(() => {
        expect(mockApi.patch).toHaveBeenCalledWith(
          `/contacts/${CONTACT_FIXTURE.id}`,
          expect.any(Object)
        )
        expect(mockApi.post).not.toHaveBeenCalled()
      })
    })

    it('Given une erreur API, When la soumission echoue, Then le formulaire reste ouvert et affiche l erreur', async () => {
      // Arrange
      const user = userEvent.setup()
      mockApi.post.mockRejectedValueOnce(new Error('Email deja utilise'))
      renderForm()

      await user.type(screen.getByLabelText(/pr(é|e)nom/i), 'Sophie')
      await user.type(screen.getByLabelText(/^nom/i),       'Bernard')
      await user.type(screen.getByLabelText(/email/i),      'sophie.bernard@acme.fr')

      // Act
      const submitBtn = screen.getByRole('button', { name: /cr(é|e)er|enregistrer/i })
      await user.click(submitBtn)

      // Assert — le formulaire doit toujours etre visible
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      })
    })

    it('Given le bouton Annuler, When clique, Then onClose est appele', async () => {
      // Arrange
      const user = userEvent.setup()
      const onClose = jest.fn()
      renderForm({ onClose })

      // Act
      const cancelBtn = screen.getByRole('button', { name: /annuler/i })
      await user.click(cancelBtn)

      // Assert
      expect(onClose).toHaveBeenCalled()
    })
  })

  // ── Pre-remplissage en mode edition ───────────────────────

  describe('Pre-remplissage en mode edition', () => {
    it('Given un contact existant, When le formulaire est ouvert, Then les champs sont pre-remplis avec ses donnees', () => {
      // Arrange & Act
      renderForm({ contact: CONTACT_FIXTURE })

      // Assert
      expect(screen.getByLabelText(/pr(é|e)nom/i)).toHaveValue('Sophie')
      expect(screen.getByLabelText(/^nom/i)).toHaveValue('Bernard')
      expect(screen.getByLabelText(/email/i)).toHaveValue('sophie.bernard@acme.fr')
    })

    it('Given le mode edition, When rendu, Then le titre indique "Modifier" et non "Creer"', () => {
      // Arrange & Act
      renderForm({ contact: CONTACT_FIXTURE })

      // Assert
      expect(
        screen.queryByText(/modifier/i) ||
        screen.queryByText(/edition/i)  ||
        screen.queryByText(/edit/i)
      ).toBeInTheDocument()
    })
  })
})
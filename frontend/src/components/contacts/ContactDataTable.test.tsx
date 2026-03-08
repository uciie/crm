// ============================================================
// src/components/contacts/ContactDataTable.test.tsx
// Tests React Testing Library — ContactsDataTable
// ============================================================

import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ── Mocks modules ────────────────────────────────────────────

jest.mock('@/hooks/useContacts', () => ({
  __esModule: true,
  useContacts: jest.fn(),
}))

jest.mock('@/hooks/useToast', () => ({
  __esModule: true,
  useToast: () => ({ toast: jest.fn() }),
}))

// CORRECTIF #1 : useAuth n'était pas mocké — le composant l'appelle
// isCommercial=true permet d'afficher le bouton "Nouveau contact"
// isAdmin=false masque le bouton "Supprimer" (simplifie les tests)
jest.mock('@/hooks/useAuth', () => ({
  __esModule: true,
  useAuth: () => ({
    isAdmin:      false,
    isCommercial: true,
    loading:      false,
  }),
}))

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter:   () => ({ push: jest.fn() }),
  usePathname: () => '/contacts',
}))

// CORRECTIF #2 : companiesService est appelé dans un useEffect — on le mocke
// pour éviter des erreurs réseau dans les tests
jest.mock('@/services/companies.service', () => ({
  __esModule: true,
  companiesService: {
    listOptions: jest.fn().mockResolvedValue([]),
    list:        jest.fn().mockResolvedValue({ data: [], pagination: {} }),
  },
}))

jest.mock('@/services/contacts.service', () => ({
  __esModule: true,
  contactsService: {
    remove: jest.fn(),
  },
}))

// ── Imports après les mocks ───────────────────────────────────

import { ContactsDataTable } from '@/components/contacts/ContactDataTable'
import { useContacts }       from '@/hooks/useContacts'

const mockUseContacts = useContacts as jest.MockedFunction<typeof useContacts>

// ── Fixtures ─────────────────────────────────────────────────

const CONTACTS_FIXTURE = [
  {
    id:            'b1000000-0000-0000-0000-000000000001',
    first_name:    'Alice',
    last_name:     'Dupont',
    email:         'alice.dupont@acme.fr',
    phone:         '+33611111111',
    mobile:        null,
    job_title:     'Directrice marketing',
    department:    null,
    city:          'Paris',
    country:       'France',
    is_subscribed: true,
    avatar_url:    null,
    linkedin_url:  null,
    address:       null,
    notes:         null,
    assigned_to:   null,
    created_at:    '2025-01-10T10:00:00Z',
    updated_at:    '2025-01-10T10:00:00Z',
    company: { id: 'c1', name: 'Acme Corp', logo_url: null, industry: 'Technologie', website: null },
  },
  {
    id:            'b1000000-0000-0000-0000-000000000002',
    first_name:    'Bernard',
    last_name:     'Martin',
    email:         'bernard.martin@beta.fr',
    phone:         null,
    mobile:        null,
    job_title:     'Responsable commercial',
    department:    null,
    city:          'Lyon',
    country:       'France',
    is_subscribed: false,
    avatar_url:    null,
    linkedin_url:  null,
    address:       null,
    notes:         null,
    assigned_to:   null,
    created_at:    '2025-01-12T10:00:00Z',
    updated_at:    '2025-01-12T10:00:00Z',
    company: { id: 'c2', name: 'Beta SAS', logo_url: null, industry: 'Finance', website: null },
  },
  {
    id:            'b1000000-0000-0000-0000-000000000003',
    first_name:    'Claire',
    last_name:     'Aubert',
    email:         'claire.aubert@gamma.fr',
    phone:         '+33633333333',
    mobile:        null,
    job_title:     'Chef de projet',
    department:    null,
    city:          'Bordeaux',
    country:       'France',
    is_subscribed: true,
    avatar_url:    null,
    linkedin_url:  null,
    address:       null,
    notes:         null,
    assigned_to:   null,
    created_at:    '2025-01-14T10:00:00Z',
    updated_at:    '2025-01-14T10:00:00Z',
    company: null,
  },
]

const DEFAULT_HOOK_RETURN = {
  contacts:   CONTACTS_FIXTURE,
  pagination: { page: 1, totalPages: 1, total: 3 },
  loading:    false,
  error:      null,
  filters:    {},
  setFilters: jest.fn(),
  refetch:    jest.fn(),
  remove:     jest.fn(),
}

// ── Helper de rendu ───────────────────────────────────────────

// CORRECTIF #3 : ContactsDataTable a des props obligatoires (onCreateClick, onEditClick)
// Le test original appelait <ContactsDataTable /> sans props → crash TypeScript/runtime
function renderTable(overrides: Record<string, unknown> = {}) {
  mockUseContacts.mockReturnValue({ ...DEFAULT_HOOK_RETURN, ...overrides } as any)
  return render(
    <ContactsDataTable
      onCreateClick={jest.fn()}
      onEditClick={jest.fn()}
    />
  )
}

// ── Suite principale ──────────────────────────────────────────

describe('ContactsDataTable', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Affichage des données ───────────────────────────────────

  describe('Affichage des données', () => {

    it('Given une liste de contacts, When le tableau est rendu, Then chaque contact apparait dans une ligne', () => {
      renderTable()
      // CORRECTIF #4 : le composant rend first_name et last_name dans deux <div> séparées,
      // pas dans un seul nœud texte "Alice Dupont". On cherche donc chaque token séparément.
      expect(screen.getAllByText('Alice')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Dupont')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Bernard')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Martin')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Claire')[0]).toBeInTheDocument()
      expect(screen.getAllByText('Aubert')[0]).toBeInTheDocument()
    })

    it('Given une liste de contacts, When le tableau est rendu, Then les emails s affichent dans les cellules', () => {
      renderTable()
      // CORRECTIF #5 : la version mobile (aria-hidden) duplique les emails via des spans.
      // getAllByText() évite le crash, on vérifie juste la présence d'au moins 1 occurrence.
      expect(screen.getAllByText('alice.dupont@acme.fr').length).toBeGreaterThan(0)
      expect(screen.getAllByText('bernard.martin@beta.fr').length).toBeGreaterThan(0)
    })

    it('Given une liste de contacts, When le tableau est rendu, Then les entreprises associees sont affichees', () => {
      renderTable()
      // Même logique : la version mobile duplique l'info entreprise
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Beta SAS').length).toBeGreaterThan(0)
    })

    it('Given un contact sans entreprise, When le tableau est rendu, Then la ligne de Claire Aubert n affiche pas de nom d entreprise', () => {
      renderTable()

      // On cible uniquement la version desktop (table) via aria-hidden sur le bloc mobile
      // La table n'a pas aria-hidden, on cherche la ligne dans le tableau sémantique
      const table = document.querySelector('table')
      expect(table).not.toBeNull()

      const rows = within(table as HTMLElement).getAllByRole('row')
      // On trouve la ligne contenant "Aubert"
      const claireRow = rows.find(row => within(row).queryByText('Aubert'))
      expect(claireRow).toBeDefined()

      if (claireRow) {
        expect(within(claireRow).queryByText('Acme Corp')).not.toBeInTheDocument()
        expect(within(claireRow).queryByText('Beta SAS')).not.toBeInTheDocument()
      }
    })

    it('Given loading=true, When le tableau est rendu, Then affiche un indicateur de chargement', () => {
      renderTable({ loading: true, contacts: [] })
      // TableSkeleton utilise animate-pulse — présent dans la version desktop et mobile
      const loader = document.querySelector('.animate-pulse')
      expect(loader).toBeInTheDocument()
    })

    it('Given une liste vide, When le tableau est rendu, Then affiche un message d absence de données', () => {
      renderTable({ contacts: [], pagination: { page: 1, totalPages: 0, total: 0 } })

      // CORRECTIF #6 : "Aucun contact trouvé" apparaît deux fois —
      // une fois dans le <td> de la table (desktop) et une fois dans le <div> mobile (aria-hidden).
      // queryAllByText évite le crash "Found multiple elements".
      // On valide qu'au moins une occurrence est visible dans le DOM.
      const msgs = screen.queryAllByText(/aucun contact trouvé/i)
      expect(msgs.length).toBeGreaterThan(0)

      // Vérification ciblée : le message est bien dans la table sémantique (accessible)
      const table = document.querySelector('table')
      if (table) {
        expect(
          within(table as HTMLElement).queryByText(/aucun contact trouvé/i)
        ).toBeInTheDocument()
      }
    })
  })

  // ── Barre de recherche ─────────────────────────────────────

  describe('Barre de recherche', () => {

    it('Given la barre de recherche, When l utilisateur saisit un terme, Then setFilters est appelé avec le terme', async () => {
      const user = userEvent.setup()
      const setFilters = jest.fn()
      renderTable({ setFilters })

      // Le composant utilise placeholder="Rechercher un contact..."
      const input = screen.getByPlaceholderText(/rechercher un contact/i)
      expect(input).toBeInTheDocument()

      await user.type(input, 'Alice')

      await waitFor(() => {
        expect(setFilters).toHaveBeenCalledWith(
          expect.objectContaining({ search: expect.stringContaining('Alice') })
        )
      })
    })

    it('Given un terme de recherche actif, When l utilisateur efface le champ, Then setFilters est appelé avec search vide', async () => {
      const user = userEvent.setup()
      const setFilters = jest.fn()
      renderTable({ setFilters })

      const input = screen.getByPlaceholderText(/rechercher un contact/i)
      await user.type(input, 'Alice')
      await user.clear(input)

      await waitFor(() => {
        const lastCall = setFilters.mock.calls[setFilters.mock.calls.length - 1]?.[0]
        expect(lastCall?.search ?? '').toBe('')
      })
    })

    it('Given l input de recherche, When rendu, Then possède un placeholder descriptif', () => {
      renderTable()
      expect(screen.getByPlaceholderText(/rechercher un contact/i)).toBeInTheDocument()
    })
  })

  // ── Tri alphabétique ───────────────────────────────────────

  describe('Tri alphabétique sur le nom', () => {

    it('Given les en-têtes de colonnes, When l en-tête "Nom" est cliqué, Then setFilters est appelé avec sort_by "last_name"', async () => {
      const user = userEvent.setup()
      const setFilters = jest.fn()
      renderTable({ setFilters })

      // CORRECTIF #7 : getByRole columnheader cherche dans la table sémantique,
      // ce qui fonctionne puisque la version mobile n'utilise pas de <th>
      const nomHeader = screen.getByRole('columnheader', { name: /nom/i })
      await user.click(nomHeader)

      expect(setFilters).toHaveBeenCalledWith(
        expect.objectContaining({ sort_by: expect.stringMatching(/last_name|name/i) })
      )
    })

    it('Given un tri asc actif sur le nom, When l en-tête est recliqué, Then setFilters est appelé avec sort_dir=desc', async () => {
      const user = userEvent.setup()
      const setFilters = jest.fn()
      // CORRECTIF #8 : le composant lit filters.sort_by et filters.sort_dir pour calculer
      // la prochaine direction → on injecte l'état de tri actuel dans les filtres
      renderTable({ filters: { sort_by: 'last_name', sort_dir: 'asc' }, setFilters })

      const nomHeader = screen.getByRole('columnheader', { name: /nom/i })
      await user.click(nomHeader)

      expect(setFilters).toHaveBeenCalledWith(
        expect.objectContaining({ sort_dir: 'desc' })
      )
    })
  })

  // ── Accessibilité de base ──────────────────────────────────

  describe('Accessibilité', () => {

    it('Given le tableau, When rendu, Then a un élément table sémantique', () => {
      renderTable()
      // screen.getByRole('table') fonctionne car la version desktop utilise <table>
      // La version mobile utilise des <div> avec aria-hidden="true" → non comptabilisée
      const table = screen.queryByRole('table') ?? document.querySelector('table')
      expect(table).toBeInTheDocument()
    })

    it('Given le tableau, When rendu, Then les en-têtes de colonnes ont un rôle "columnheader"', () => {
      renderTable()
      const headers = screen.getAllByRole('columnheader')
      // Le composant a : Nom, Entreprise, Email, Téléphone, Email mktg, Mis à jour + 1 vide
      expect(headers.length).toBeGreaterThanOrEqual(3)
    })
  })
})
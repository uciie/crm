// ============================================================
// src/components/contacts/ContactDetailView.test.tsx
// ============================================================

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Mocks modules ─────────────────────────────────────────────────────────────

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: {
    get:    jest.fn(),
    post:   jest.fn(),
    patch:  jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@/hooks/useToast', () => ({
  __esModule: true,
  useToast: () => ({ toast: jest.fn() }),
}))

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter:   () => ({ push: jest.fn(), back: jest.fn() }),
  useParams:   () => ({ id: 'b1000000-0000-0000-0000-000000000001' }),
  usePathname: () => '/contacts/b1000000-0000-0000-0000-000000000001',
}))

// CORRECTIF #1 : useContacts.ts exporte useContactDetail comme alias de useContacts.
// Le mock doit déclarer useContactDetail (le nom utilisé par ContactDetailView ligne 3).
jest.mock('@/hooks/useContacts', () => ({
  __esModule:       true,
  useContactDetail: jest.fn(),
  useContacts:      jest.fn(), // alias — mocké pour éviter tout appel réseau indirect
}))

// CORRECTIF #2 : la cause racine du crash.
//
// Erreur : "Cannot destructure property 'company' of useCompany(...) as it is undefined"
// Ligne   : CompanyDetailView.tsx:5 → const { company, loading } = useCompany(null)
//
// Pourquoi : jest.fn() sans implémentation retourne `undefined` par défaut.
// Quand CompanyDetailView appelle useCompany(), il reçoit undefined et tente
// immédiatement de le destructurer → TypeError fatal avant même le rendu.
//
// Solution : mockReturnValue doit être défini AU NIVEAU DU MOCK FACTORY
// avec jest.fn().mockReturnValue({...}) pour que la valeur par défaut soit
// toujours un objet valide, même si mockReturnValue n'est pas rappelé dans beforeEach.
jest.mock('@/hooks/useCompanies', () => ({
  __esModule: true,
  // Valeur par défaut sûre : company=null + loading=false
  // → CompanyDetailView rend "Aucune entreprise" sans crasher
  useCompany: jest.fn().mockReturnValue({
    company:  null,
    loading:  false,
    error:    null,
    refetch:  jest.fn(),
  }),
  // Alias — même valeur par défaut sûre
  useCompanyDetail: jest.fn().mockReturnValue({
    company:  null,
    loading:  false,
    error:    null,
    refetch:  jest.fn(),
  }),
  useCompanyOptions: jest.fn().mockReturnValue({ options: [], loading: false }),
}))

// ── Imports après les mocks ───────────────────────────────────────────────────

import { ContactDetailView }  from '@/components/contacts/ContactDetailView'
import { CompanyDetailView }  from '@/components/companies/CompanyDetailView'
import { useContactDetail }   from '@/hooks/useContacts'
import { useCompany }         from '@/hooks/useCompanies'

// CORRECTIF #3 : on importe ET on caste useCompany (le vrai nom du hook dans le composant),
// pas useCompanyDetail. C'est useCompany que CompanyDetailView.tsx appelle ligne 5.
const mockUseContactDetail = useContactDetail as jest.Mock
const mockUseCompany       = useCompany       as jest.Mock

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CONTACT_ID = 'b1000000-0000-0000-0000-000000000001'
const COMPANY_ID = 'c1000000-0000-0000-0000-000000000001'

const CONTACT_FIXTURE = {
  id:            CONTACT_ID,
  first_name:    'Sophie',
  last_name:     'Bernard',
  email:         'sophie.bernard@acme.fr',
  phone:         '+33612345678',
  mobile:        '+33712345678',
  job_title:     'Directrice commerciale',
  department:    'Ventes',
  city:          'Paris',
  country:       'France',
  linkedin_url:  'https://linkedin.com/in/sophie-bernard',
  is_subscribed: true,
  notes:         'Contact prioritaire pour le Q2 2025',
  avatar_url:    null,
  created_at:    '2025-01-10T10:00:00Z',
  updated_at:    '2025-01-15T14:00:00Z',
  company: {
    id:       COMPANY_ID,
    name:     'Acme Corp',
    logo_url: null,
    industry: 'Technologie',
    website:  'https://acme.fr',
  },
}

const INTERACTIONS_FIXTURE = [
  {
    id:          'i1',
    type:        'email',
    subject:     'Proposition commerciale Q2',
    body:        'Envoi de la proposition.',
    direction:   'sortant',
    occurred_at: '2025-03-10T14:30:00Z',
    created_at:  '2025-03-10T14:30:00Z',
    author:      { id: 'a1', full_name: 'Admin CRM', avatar_url: null },
  },
  {
    id:          'i2',
    type:        'appel',
    subject:     'Appel de suivi',
    body:        'Confirmation du rendez-vous.',
    direction:   'entrant',
    occurred_at: '2025-02-20T09:00:00Z',
    created_at:  '2025-02-20T09:00:00Z',
    author:      { id: 'a1', full_name: 'Admin CRM', avatar_url: null },
  },
  {
    id:          'i3',
    type:        'note',
    subject:     'Note interne',
    body:        'Contact tres interesse par la solution premium.',
    direction:   null,
    occurred_at: '2025-01-25T11:00:00Z',
    created_at:  '2025-01-25T11:00:00Z',
    author:      { id: 'a1', full_name: 'Admin CRM', avatar_url: null },
  },
]

const COMPANY_FIXTURE = {
  id:             COMPANY_ID,
  name:           'Acme Corp',
  domain:         'acme.fr',
  industry:       'Technologie',
  size:           '51-200' as const,
  website:        'https://acme.fr',
  phone:          '+33140000000',
  city:           'Paris',
  country:        'France',
  logo_url:       null,
  annual_revenue: '5000000.00',
  notes:          'Client historique depuis 2022.',
  created_at:     '2022-06-01T10:00:00Z',
  updated_at:     '2025-01-10T09:00:00Z',
  contacts: [
    {
      id:         CONTACT_ID,
      first_name: 'Sophie',
      last_name:  'Bernard',
      email:      'sophie.bernard@acme.fr',
      job_title:  'Directrice commerciale',
      phone:      '+33612345678',
      avatar_url: null,
    },
    {
      id:         'b2',
      first_name: 'Marc',
      last_name:  'Leroy',
      email:      'marc.leroy@acme.fr',
      job_title:  'Responsable technique',
      phone:      null,
      avatar_url: null,
    },
  ],
}

// ── Suite ContactDetailView ───────────────────────────────────────────────────

describe('ContactDetailView', () => {

  beforeEach(() => {
    jest.clearAllMocks()
    // CORRECTIF #4 : après clearAllMocks(), les mocks perdent leur mockReturnValue.
    // On réinitialise useCompany avec une valeur sûre pour éviter tout crash
    // dans les tests ContactDetailView qui ne se préoccupent pas de CompanyDetailView.
    mockUseCompany.mockReturnValue({
      company: null, loading: false, error: null, refetch: jest.fn(),
    })
  })

  describe('Informations détaillées', () => {

    it('Given un contact chargé, When la vue detail est rendue, Then affiche le nom complet', () => {
      mockUseContactDetail.mockReturnValue({
        contact: { ...CONTACT_FIXTURE, interactions: INTERACTIONS_FIXTURE },
        loading: false, error: null, refetch: jest.fn(),
      })

      render(<ContactDetailView />)

      expect(screen.getByText('Sophie Bernard')).toBeInTheDocument()
    })

    it('Given un contact avec email, When la vue detail est rendue, Then l email est affiché et cliquable', () => {
      mockUseContactDetail.mockReturnValue({
        contact: { ...CONTACT_FIXTURE, interactions: INTERACTIONS_FIXTURE },
        loading: false, error: null, refetch: jest.fn(),
      })

      render(<ContactDetailView />)

      const emailLink = screen.getByText('sophie.bernard@acme.fr')
      expect(emailLink).toBeInTheDocument()
      const anchor = emailLink.closest('a')
      expect(anchor).not.toBeNull()
      expect(anchor).toHaveAttribute('href', expect.stringContaining('mailto:'))
    })

    it('Given un contact avec entreprise, When la vue detail est rendue, Then le nom de l entreprise est affiché', () => {
      mockUseContactDetail.mockReturnValue({
        contact: { ...CONTACT_FIXTURE, interactions: INTERACTIONS_FIXTURE },
        loading: false, error: null, refetch: jest.fn(),
      })

      render(<ContactDetailView />)

      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('Given un contact avec notes, When la vue detail est rendue, Then les notes sont affichées', () => {
      mockUseContactDetail.mockReturnValue({
        contact: { ...CONTACT_FIXTURE, interactions: INTERACTIONS_FIXTURE },
        loading: false, error: null, refetch: jest.fn(),
      })

      render(<ContactDetailView />)

      expect(screen.getByText(/Contact prioritaire pour le Q2 2025/i)).toBeInTheDocument()
    })

    it('Given loading=true, When la vue est rendue, Then affiche un indicateur de chargement', () => {
      mockUseContactDetail.mockReturnValue({
        contact: null, loading: true, error: null, refetch: jest.fn(),
      })

      render(<ContactDetailView />)

      const loader = document.querySelector('[aria-busy="true"], .animate-pulse')
      expect(loader).toBeInTheDocument()
    })
  })

  describe('Timeline des interactions', () => {

    beforeEach(() => {
      mockUseContactDetail.mockReturnValue({
        contact: { ...CONTACT_FIXTURE, interactions: INTERACTIONS_FIXTURE },
        loading: false, error: null, refetch: jest.fn(),
      })
    })

    it('Given 3 interactions, When la timeline est rendue, Then les 3 entrées s affichent', () => {
      render(<ContactDetailView />)

      expect(screen.getByText('Proposition commerciale Q2')).toBeInTheDocument()
      expect(screen.getByText('Appel de suivi')).toBeInTheDocument()
      expect(screen.getByText('Note interne')).toBeInTheDocument()
    })

    it('Given des interactions avec dates, When la timeline est rendue, Then la plus récente apparait en premier', () => {
      render(<ContactDetailView />)

      const items = screen.getAllByText(/proposition commerciale Q2|appel de suivi|note interne/i)
      expect(items[0].textContent).toMatch(/proposition commerciale Q2/i)
    })

    it('Given la timeline, When rendue, Then contient des icônes Clock de lucide-react', () => {
      render(<ContactDetailView />)

      const clockIcons = document.querySelectorAll('[aria-label="clock"]')
      if (clockIcons.length > 0) {
        expect(clockIcons.length).toBeGreaterThan(0)
      } else {
        const timeline = document.querySelector('[data-testid="timeline"]')
        expect(timeline).toBeInTheDocument()
        expect(timeline!.querySelectorAll('svg').length).toBeGreaterThan(0)
      }
    })

    it('Given une interaction de type "email", When la timeline est rendue, Then l icône mail est présente', () => {
      render(<ContactDetailView />)

      const mailIcon = document.querySelector('[aria-label="mail"], [data-lucide="mail"]')
      expect(mailIcon).toBeInTheDocument()
    })

    it('Given aucune interaction, When la timeline est rendue, Then affiche un message d absence d activité', () => {
      mockUseContactDetail.mockReturnValue({
        contact: { ...CONTACT_FIXTURE, interactions: [] },
        loading: false, error: null, refetch: jest.fn(),
      })

      render(<ContactDetailView />)

      expect(
        screen.queryByText(/aucune activit(é|e)/i) ??
        screen.queryByText(/aucune interaction/i)
      ).toBeInTheDocument()
    })
  })
})

// ── Suite CompanyDetailView ───────────────────────────────────────────────────

describe('CompanyDetailView', () => {

  beforeEach(() => {
    jest.clearAllMocks()
    // CORRECTIF #5 : réinitialiser useContactDetail avec une valeur sûre
    // pour éviter tout crash si ContactDetailView est importé dans le même scope.
    mockUseContactDetail.mockReturnValue({
      contact: null, loading: false, error: null, refetch: jest.fn(),
    })
  })

  describe('Informations de l entreprise', () => {

    it('Given une entreprise chargée, When la vue detail est rendue, Then affiche le nom', () => {
      // CORRECTIF #6 : on cible mockUseCompany (useCompany = le hook réel appelé par
      // CompanyDetailView ligne 5), pas mockUseCompanyDetail (alias non utilisé dans le composant).
      mockUseCompany.mockReturnValue({
        company: COMPANY_FIXTURE, loading: false, error: null, refetch: jest.fn(),
      })

      render(<CompanyDetailView />)

      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('Given une entreprise avec secteur et ville, When rendue, Then ces informations sont affichées', () => {
      mockUseCompany.mockReturnValue({
        company: COMPANY_FIXTURE, loading: false, error: null, refetch: jest.fn(),
      })

      render(<CompanyDetailView />)

      expect(screen.getByText('Technologie')).toBeInTheDocument()
      expect(screen.getByText('Paris')).toBeInTheDocument()
    })

    it('Given une entreprise avec website, When rendue, Then le site web est un lien externe', () => {
      mockUseCompany.mockReturnValue({
        company: COMPANY_FIXTURE, loading: false, error: null, refetch: jest.fn(),
      })

      render(<CompanyDetailView />)

      const websiteLink =
        screen.queryByRole('link', { name: /acme\.fr/i }) ??
        document.querySelector('a[href="https://acme.fr"]')

      expect(websiteLink).toBeInTheDocument()
      expect(websiteLink).toHaveAttribute('target', '_blank')
    })
  })

  describe('Liste des contacts liés', () => {

    it('Given une entreprise avec 2 contacts, When rendue, Then les 2 contacts sont listés', () => {
      mockUseCompany.mockReturnValue({
        company: COMPANY_FIXTURE, loading: false, error: null, refetch: jest.fn(),
      })

      render(<CompanyDetailView />)

      expect(screen.getByText('Sophie')).toBeInTheDocument()
      expect(screen.getByText('Bernard')).toBeInTheDocument()
      expect(screen.getByText('Marc')).toBeInTheDocument()
      expect(screen.getByText('Leroy')).toBeInTheDocument()
    })

    it('Given une entreprise sans contact, When rendue, Then affiche un message d absence', () => {
      mockUseCompany.mockReturnValue({
        company: { ...COMPANY_FIXTURE, contacts: [] },
        loading: false, error: null, refetch: jest.fn(),
      })

      render(<CompanyDetailView />)

      expect(
        screen.queryByText(/aucun contact/i) ??
        screen.queryByText(/pas de contact/i)
      ).toBeInTheDocument()
    })
  })
})
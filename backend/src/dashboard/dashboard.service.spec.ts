// @ts-nocheck
/// <reference types="jest" />
// ============================================================
// src/dashboard/dashboard.service.spec.ts
// Tests unitaires — DashboardService
// Convention : Given-When-Then
// ============================================================

// ── Mock objects déclarés AVANT jest.mock() ───────────────────
//
//  Regle Jest : seules les variables dont le nom commence par "mock"
//  peuvent etre referencees dans une factory jest.mock() apres hoisting.

const mockExecute = jest.fn()

const mockDb = {
  execute: mockExecute,
}

// ── jest.mock() — hoistes automatiquement par ts-jest ─────────

jest.mock('../database/db.config', () => ({ db: mockDb }))
jest.mock('../database/schema',    () => ({
  leads:          'leads_table',
  contacts:       'contacts_table',
  tasks:          'tasks_table',
  communications: 'communications_table',
  profiles:       'profiles_table',
}))
jest.mock('drizzle-orm', () => ({
  sql: new Proxy(
    // tag template — retourne un objet opaque que db.execute accepte
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    {
      // sql`...` appele comme tag
      apply: (_t, _ctx, args) => ({ strings: args[0], values: args.slice(1) }),
    }
  ),
}))

// ── Import apres les mocks ────────────────────────────────────
import { Test, TestingModule } from '@nestjs/testing'
import { DashboardService }    from './dashboard.service'
import type {
  KpiResult,
  AppointmentRow,
  LeadsByStatusRow,
  LeadsBySourceRow,
  ContactsBySegmentRow,
  LtvRow,
} from './dashboard.service'

// ── Helpers de fixtures ───────────────────────────────────────

/** Construit la reponse generique de db.execute() */
function dbRows(rows: Record<string, unknown>[]): { rows: Record<string, unknown>[] } {
  return { rows }
}

/**
 * Configure les 12 appels successifs de db.execute() attendus par getKpis().
 * L'ordre correspond exactement a celui du Promise.all() dans le service :
 *   1-8  : période courante
 *   9-12 : période précédente
 */
function mockKpiExecuteCalls(overrides: {
  revenue?:       number
  won?:           number
  total?:         number
  pipeline?:      number
  overdue?:       number
  urgent?:        number
  newContacts?:   number
  totalContacts?: number
  appointments?:  AppointmentRow[]
} = {}) {
  const {
    revenue       = 15000,
    won           = 3,
    total         = 10,
    pipeline      = 42000,
    overdue       = 2,
    urgent        = 1,
    newContacts   = 5,
    totalContacts = 48,
    appointments  = [],
  } = overrides

  // ── Période courante ──────────────────────────────────────
  // 1 — CA
  mockExecute.mockResolvedValueOnce(dbRows([{ revenue }]))
  // 2 — Conversion
  mockExecute.mockResolvedValueOnce(dbRows([{ won, total }]))
  // 3 — Pipeline
  mockExecute.mockResolvedValueOnce(dbRows([{ pipeline_total: pipeline }]))
  // 4 — Taches en retard
  mockExecute.mockResolvedValueOnce(dbRows([{ overdue }]))
  // 5 — Taches urgentes
  mockExecute.mockResolvedValueOnce(dbRows([{ urgent }]))
  // 6 — Nouveaux contacts
  mockExecute.mockResolvedValueOnce(dbRows([{ new_contacts: newContacts }]))
  // 7 — Total contacts
  mockExecute.mockResolvedValueOnce(dbRows([{ total_contacts: totalContacts }]))
  // 8 — Rendez-vous du jour
  mockExecute.mockResolvedValueOnce(dbRows(appointments as any))

  // ── Période précédente ────────────────────────────────────
  // 9 — CA période précédente
  mockExecute.mockResolvedValueOnce(dbRows([{ revenue: 0 }]))
  // 10 — Conversion période précédente
  mockExecute.mockResolvedValueOnce(dbRows([{ won: 0, total: 0 }]))
  // 11 — Nouveaux contacts période précédente
  mockExecute.mockResolvedValueOnce(dbRows([{ new_contacts: 0 }]))
  // 12 — Taches en retard période précédente
  mockExecute.mockResolvedValueOnce(dbRows([{ overdue: 0 }]))
}

// ── IDs de test ───────────────────────────────────────────────

const COMMERCIAL_ID = 'uuid-commercial-1'
const ADMIN_ID      = 'uuid-admin-1'

// ─────────────────────────────────────────────────────────────
// Suite principale
// ─────────────────────────────────────────────────────────────

describe('DashboardService', () => {
  let service: DashboardService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService],
    }).compile()

    service = module.get<DashboardService>(DashboardService)
  })

  // ===========================================================
  // 1. STATISTIQUES COMMERCIALES
  // ===========================================================

  describe('getKpis() — Statistiques commerciales', () => {

    // ── CA du mois ──────────────────────────────────────────

    describe('revenue_this_month', () => {
      it('Given des leads gagnes ce mois — When getKpis() est appele — Then retourne la somme correcte', async () => {
        // Given
        mockKpiExecuteCalls({ revenue: 25000 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.revenue_this_month).toBe(25000)
      })

      it('Given aucun lead gagne — When getKpis() est appele — Then revenue_this_month vaut 0', async () => {
        // Given
        mockKpiExecuteCalls({ revenue: 0 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.revenue_this_month).toBe(0)
      })

      it('Given une reponse DB avec valeur NULL — When getKpis() est appele — Then revenue_this_month vaut 0', async () => {
        // Given — simule un COALESCE qui retournerait quand meme null
        mockKpiExecuteCalls({ revenue: null as any })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then — Number(null ?? 0) === 0
        expect(result.revenue_this_month).toBe(0)
      })
    })

    // ── Taux de conversion ──────────────────────────────────

    describe('conversion_rate', () => {
      it('Given 3 leads gagnes sur 10 — When getKpis() est appele — Then conversion_rate vaut 30', async () => {
        // Given
        mockKpiExecuteCalls({ won: 3, total: 10 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.conversion_rate).toBe(30)
      })

      it('Given 1 lead gagne sur 3 — When getKpis() est appele — Then conversion_rate est arrondi a 33', async () => {
        // Given
        mockKpiExecuteCalls({ won: 1, total: 3 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then — Math.round(1/3 * 100) = 33
        expect(result.conversion_rate).toBe(33)
      })

      it('Given 0 lead au total — When getKpis() est appele — Then conversion_rate vaut 0 (pas de division par zero)', async () => {
        // Given
        mockKpiExecuteCalls({ won: 0, total: 0 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then — protection division par zero
        expect(result.conversion_rate).toBe(0)
      })

      it('Given tous les leads sont gagnes — When getKpis() est appele — Then conversion_rate vaut 100', async () => {
        // Given
        mockKpiExecuteCalls({ won: 5, total: 5 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.conversion_rate).toBe(100)
      })
    })

    // ── Pipeline total ──────────────────────────────────────

    describe('pipeline_total', () => {
      it('Given des leads actifs en cours — When getKpis() est appele — Then pipeline_total est la somme des deals actifs', async () => {
        // Given
        mockKpiExecuteCalls({ pipeline: 87500 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.pipeline_total).toBe(87500)
      })

      it('Given aucun deal actif — When getKpis() est appele — Then pipeline_total vaut 0', async () => {
        // Given
        mockKpiExecuteCalls({ pipeline: 0 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.pipeline_total).toBe(0)
      })
    })

    // ── Filtrage par role ───────────────────────────────────

    describe('filtrage par role', () => {
      it('Given un role admin — When getKpis() est appele — Then db.execute est appele 12 fois (toutes les requetes + periode precedente)', async () => {
        // Given
        mockKpiExecuteCalls({})

        // When
        await service.getKpis(ADMIN_ID, 'admin')

        // Then — 12 requetes paralleles via Promise.all (8 courantes + 4 précédentes)
        expect(mockExecute).toHaveBeenCalledTimes(12)
      })

      it('Given un role commercial — When getKpis() est appele — Then db.execute est appele 12 fois', async () => {
        // Given
        mockKpiExecuteCalls({})

        // When
        await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(mockExecute).toHaveBeenCalledTimes(12)
      })
    })

    // ── Filtre de periode ───────────────────────────────────

    describe('resolveDateRange — filtre de periode', () => {
      it('Given startDate et endDate fournis — When getKpis() est appele — Then les dates personnalisees sont utilisees', async () => {
        // Given
        mockKpiExecuteCalls({ revenue: 5000 })

        // When — trimestre Q1 2025
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial', '2025-01-01', '2025-03-31')

        // Then — le service ne plante pas et retourne un resultat coherent
        expect(result.revenue_this_month).toBe(5000)
        expect(mockExecute).toHaveBeenCalledTimes(12)
      })

      it('Given aucune date fournie — When getKpis() est appele — Then le mois courant est utilise par defaut', async () => {
        // Given — pas de startDate/endDate
        mockKpiExecuteCalls({ revenue: 3000 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then — pas d erreur, comportement par defaut
        expect(result).toHaveProperty('revenue_this_month')
        expect(result.revenue_this_month).toBe(3000)
      })
    })
  })

  // ===========================================================
  // 2. STATISTIQUES CLIENTS
  // ===========================================================

  describe('getKpis() — Statistiques clients', () => {

    describe('total_contacts', () => {
      it('Given 48 contacts en base — When getKpis() est appele — Then total_contacts vaut 48', async () => {
        // Given
        mockKpiExecuteCalls({ totalContacts: 48 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.total_contacts).toBe(48)
      })

      it('Given aucun contact — When getKpis() est appele — Then total_contacts vaut 0', async () => {
        // Given
        mockKpiExecuteCalls({ totalContacts: 0 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.total_contacts).toBe(0)
      })
    })

    describe('new_contacts', () => {
      it('Given 5 nouveaux contacts ce mois — When getKpis() est appele — Then new_contacts vaut 5', async () => {
        // Given
        mockKpiExecuteCalls({ newContacts: 5 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.new_contacts).toBe(5)
      })
    })
  })

  // ===========================================================
  // 3. getContactsBySegment — Segmentation clients
  // ===========================================================

  describe('getContactsBySegment()', () => {
    it('Given des contacts avec secteur — When dimension=industry — Then retourne un tableau groupe par secteur', async () => {
      // Given
      const rows: ContactsBySegmentRow[] = [
        { segment: 'Technologie', count: 12 },
        { segment: 'Sante',       count:  8 },
        { segment: 'Finance',     count:  5 },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rows as any))

      // When
      const result = await service.getContactsBySegment(ADMIN_ID, 'admin', 'industry')

      // Then
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ segment: 'Technologie', count: 12 })
    })

    it('Given des contacts avec ville — When dimension=city — Then retourne un tableau groupe par ville', async () => {
      // Given
      const rows: ContactsBySegmentRow[] = [
        { segment: 'Paris', count: 20 },
        { segment: 'Lyon',  count: 10 },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rows as any))

      // When
      const result = await service.getContactsBySegment(ADMIN_ID, 'admin', 'city')

      // Then
      expect(result).toHaveLength(2)
      expect(result[0].segment).toBe('Paris')
    })

    it('Given aucun contact en base — When getContactsBySegment() est appele — Then retourne un tableau vide', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      const result = await service.getContactsBySegment(COMMERCIAL_ID, 'commercial', 'industry')

      // Then
      expect(result).toEqual([])
    })

    it('Given dimension non fournie — When getContactsBySegment() est appele — Then la dimension par defaut est industry', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([{ segment: 'Retail', count: 3 }]))

      // When — pas de 3e argument
      const result = await service.getContactsBySegment(COMMERCIAL_ID, 'commercial')

      // Then — le service ne plante pas avec la valeur par defaut
      expect(result).toHaveLength(1)
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================
  // 3b. getLtv — Lifetime Value
  // ===========================================================

  describe('getLtv()', () => {
    it('Given des contacts avec deals gagnes — When getLtv() est appele — Then retourne les contacts tries par LTV decroissante', async () => {
      // Given
      const rawRows = [
        { contact_id: 'uuid-c1', first_name: 'Alice', last_name: 'Martin',  company_name: 'Acme',  ltv: '45000', deals_count: '3' },
        { contact_id: 'uuid-c2', first_name: 'Bob',   last_name: 'Dupont', company_name: 'Beta',  ltv: '12000', deals_count: '1' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getLtv(ADMIN_ID, 'admin')

      // Then — les nombres sont bien convertis depuis les strings SQL
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject<LtvRow>({
        contact_id:   'uuid-c1',
        first_name:   'Alice',
        last_name:    'Martin',
        company_name: 'Acme',
        ltv:          45000,
        deals_count:  3,
      })
    })

    it('Given aucun contact avec deals — When getLtv() est appele — Then retourne un tableau vide', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      const result = await service.getLtv(ADMIN_ID, 'admin')

      // Then
      expect(result).toEqual([])
    })

    it('Given un contact sans entreprise — When getLtv() est appele — Then company_name est null', async () => {
      // Given
      const rawRows = [
        { contact_id: 'uuid-c3', first_name: 'Carl', last_name: 'Solo', company_name: null, ltv: '8000', deals_count: '2' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getLtv(ADMIN_ID, 'admin')

      // Then
      expect(result[0].company_name).toBeNull()
    })

    it('Given un limit personnalise — When getLtv(limit=5) est appele — Then db.execute est appele une seule fois', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      await service.getLtv(ADMIN_ID, 'admin', 5)

      // Then
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================
  // 4. PERFORMANCE MARKETING
  // ===========================================================

  describe('getLeadsBySource()', () => {
    it('Given des leads de sources differentes — When getLeadsBySource() est appele — Then retourne l agregation par source avec win_rate calcule', async () => {
      // Given
      const rawRows = [
        { source: 'Google Ads', total_leads: '10', won_leads: '4', revenue: '20000' },
        { source: 'SEO',        total_leads:  '5', won_leads: '1', revenue:  '5000' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getLeadsBySource(ADMIN_ID, 'admin')

      // Then
      expect(result).toHaveLength(2)

      const googleAds = result.find(r => r.source === 'Google Ads')!
      expect(googleAds.total_leads).toBe(10)
      expect(googleAds.won_leads).toBe(4)
      expect(googleAds.revenue).toBe(20000)
      expect(googleAds.win_rate).toBe(40)   // Math.round(4/10*100)

      const seo = result.find(r => r.source === 'SEO')!
      expect(seo.win_rate).toBe(20)          // Math.round(1/5*100)
    })

    it('Given une source avec 0 lead — When getLeadsBySource() est appele — Then win_rate vaut 0 (pas de division par zero)', async () => {
      // Given
      const rawRows = [
        { source: 'Email', total_leads: '0', won_leads: '0', revenue: '0' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getLeadsBySource(ADMIN_ID, 'admin')

      // Then — protection division par zero dans le .map()
      expect(result[0].win_rate).toBe(0)
    })

    it('Given des leads sans source renseignee — When getLeadsBySource() est appele — Then la source est "Non renseigne"', async () => {
      // Given — le SQL fait COALESCE(source, "Non renseigne")
      const rawRows = [
        { source: 'Non renseigné', total_leads: '3', won_leads: '0', revenue: '0' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getLeadsBySource(ADMIN_ID, 'admin')

      // Then
      expect(result[0].source).toBe('Non renseigné')
    })

    it('Given aucun lead en base — When getLeadsBySource() est appele — Then retourne un tableau vide', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      const result = await service.getLeadsBySource(ADMIN_ID, 'admin')

      // Then
      expect(result).toEqual([])
    })

    it('Given un filtre de periode — When getLeadsBySource() est appele avec startDate/endDate — Then db.execute est appele une seule fois', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      await service.getLeadsBySource(ADMIN_ID, 'admin', '2025-01-01', '2025-03-31')

      // Then
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================
  // 5. DASHBOARD ACCUEIL — AGENDA ET TACHES
  // ===========================================================

  describe('getKpis() — Agenda et taches urgentes', () => {

    describe('todays_appointments', () => {
      it('Given des rendez-vous planifies aujourd hui — When getKpis() est appele — Then retourne la liste des RDV du jour', async () => {
        // Given
        const appointments: AppointmentRow[] = [
          { id: 'uuid-t1', title: 'Demo client Acme',   due_date: '2025-03-07T10:00:00Z' },
          { id: 'uuid-t2', title: 'Appel suivi Beta',   due_date: '2025-03-07T14:00:00Z' },
        ]
        mockKpiExecuteCalls({ appointments })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.todays_appointments).toHaveLength(2)
        expect(result.todays_appointments[0].title).toBe('Demo client Acme')
        expect(result.todays_appointments[1].id).toBe('uuid-t2')
      })

      it('Given aucun rendez-vous aujourd hui — When getKpis() est appele — Then todays_appointments est un tableau vide', async () => {
        // Given
        mockKpiExecuteCalls({ appointments: [] })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.todays_appointments).toEqual([])
      })
    })

    describe('overdue_tasks', () => {
      it('Given 2 taches en retard — When getKpis() est appele — Then overdue_tasks vaut 2', async () => {
        // Given
        mockKpiExecuteCalls({ overdue: 2 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.overdue_tasks).toBe(2)
      })

      it('Given aucune tache en retard — When getKpis() est appele — Then overdue_tasks vaut 0', async () => {
        // Given
        mockKpiExecuteCalls({ overdue: 0 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.overdue_tasks).toBe(0)
      })
    })

    describe('urgent_tasks', () => {
      it('Given 3 taches urgentes non terminees — When getKpis() est appele — Then urgent_tasks vaut 3', async () => {
        // Given
        mockKpiExecuteCalls({ urgent: 3 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.urgent_tasks).toBe(3)
      })

      it('Given aucune tache urgente — When getKpis() est appele — Then urgent_tasks vaut 0', async () => {
        // Given
        mockKpiExecuteCalls({ urgent: 0 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then
        expect(result.urgent_tasks).toBe(0)
      })

      it('Given des taches urgentes et des taches en retard — When getKpis() est appele — Then les deux compteurs sont distincts', async () => {
        // Given — 1 tache urgente future, 4 taches en retard
        mockKpiExecuteCalls({ urgent: 1, overdue: 4 })

        // When
        const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

        // Then — les deux champs sont independants
        expect(result.urgent_tasks).toBe(1)
        expect(result.overdue_tasks).toBe(4)
        expect(result.urgent_tasks).not.toBe(result.overdue_tasks)
      })
    })
  })

  // ===========================================================
  // 6. getLeadsByStatus — Pipeline par statut
  // ===========================================================

  describe('getLeadsByStatus()', () => {
    it('Given des leads dans plusieurs statuts — When getLeadsByStatus() est appele — Then retourne la liste groupee par statut', async () => {
      // Given
      const rawRows = [
        { status: 'nouveau',     count: '5', total_value: '0'     },
        { status: 'qualifié',    count: '3', total_value: '15000' },
        { status: 'proposition', count: '2', total_value: '30000' },
        { status: 'gagné',       count: '4', total_value: '80000' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getLeadsByStatus(ADMIN_ID, 'admin')

      // Then
      expect(result).toHaveLength(4)
      expect(result[0].status).toBe('nouveau')
      expect(result[3].status).toBe('gagné')
    })

    it('Given aucun lead — When getLeadsByStatus() est appele — Then retourne un tableau vide', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      const result = await service.getLeadsByStatus(ADMIN_ID, 'admin')

      // Then
      expect(result).toEqual([])
    })

    it('Given un filtre de periode — When getLeadsByStatus() est appele avec des dates — Then db.execute est appele une seule fois', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      await service.getLeadsByStatus(COMMERCIAL_ID, 'commercial', '2025-01-01', '2025-06-30')

      // Then
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================
  // 7. getTopCommercials — Classement commerciaux
  // ===========================================================

  describe('getTopCommercials()', () => {
    it('Given des commerciaux avec du CA — When getTopCommercials() est appele — Then retourne les 5 premiers tries par revenue', async () => {
      // Given
      const rawRows = [
        { id: 'uuid-p1', full_name: 'Alice Dupont',  avatar_url: null, deals_won: '5', revenue: '50000' },
        { id: 'uuid-p2', full_name: 'Bob Martin',    avatar_url: null, deals_won: '3', revenue: '30000' },
        { id: 'uuid-p3', full_name: 'Clara Leroy',   avatar_url: null, deals_won: '2', revenue: '20000' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getTopCommercials()

      // Then
      expect(result).toHaveLength(3)
      expect((result[0] as any).full_name).toBe('Alice Dupont')
    })

    it('Given aucun commercial actif ce mois — When getTopCommercials() est appele — Then retourne un tableau vide', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      const result = await service.getTopCommercials()

      // Then
      expect(result).toEqual([])
    })

    it('Given une periode personnalisee — When getTopCommercials(startDate, endDate) est appele — Then db.execute est appele une seule fois', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      await service.getTopCommercials('2025-01-01', '2025-03-31')

      // Then
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================
  // 8. getActivityFeed — Fil d'activite
  // ===========================================================

  describe('getActivityFeed()', () => {
    it('Given des communications et des leads — When getActivityFeed() est appele — Then retourne les activites triees par date', async () => {
      // Given
      const rawRows = [
        { type: 'communication', id: 'uuid-c1', subtype: 'email',  title: 'Suivi client',  date: '2025-03-07T15:00:00Z', actor: 'Alice', target: 'Bob Client'  },
        { type: 'lead',          id: 'uuid-l1', subtype: 'gagné',  title: 'Deal Acme',     date: '2025-03-07T10:00:00Z', actor: 'Alice', target: 'Eve Directrice' },
      ]
      mockExecute.mockResolvedValueOnce(dbRows(rawRows))

      // When
      const result = await service.getActivityFeed(COMMERCIAL_ID, 'commercial')

      // Then
      expect(result).toHaveLength(2)
      expect((result[0] as any).type).toBe('communication')
    })

    it('Given aucune activite — When getActivityFeed() est appele — Then retourne un tableau vide', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      const result = await service.getActivityFeed(COMMERCIAL_ID, 'commercial')

      // Then
      expect(result).toEqual([])
    })

    it('Given un limit personnalise — When getActivityFeed(limit=5) est appele — Then db.execute est appele une seule fois', async () => {
      // Given
      mockExecute.mockResolvedValueOnce(dbRows([]))

      // When
      await service.getActivityFeed(COMMERCIAL_ID, 'commercial', 5)

      // Then
      expect(mockExecute).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================
  // 9. COHERENCE DE LA STRUCTURE DE RETOUR
  // ===========================================================

  describe('getKpis() — structure de retour', () => {
    it('Given un appel standard — When getKpis() est appele — Then la reponse contient exactement les champs definis dans KpiResult', async () => {
      // Given
      mockKpiExecuteCalls({})

      // When
      const result: KpiResult = await service.getKpis(COMMERCIAL_ID, 'commercial')

      // Then — verification exhaustive des cles
      expect(result).toHaveProperty('revenue_this_month')
      expect(result).toHaveProperty('conversion_rate')
      expect(result).toHaveProperty('pipeline_total')
      expect(result).toHaveProperty('total_contacts')
      expect(result).toHaveProperty('new_contacts')
      expect(result).toHaveProperty('overdue_tasks')
      expect(result).toHaveProperty('urgent_tasks')
      expect(result).toHaveProperty('todays_appointments')
      expect(Array.isArray(result.todays_appointments)).toBe(true)
    })

    it('Given tous les indicateurs a zero — When getKpis() retourne des zeros — Then aucune valeur n est NaN ou undefined', async () => {
      // Given — toutes les requetes retournent 0
      mockKpiExecuteCalls({
        revenue: 0, won: 0, total: 0, pipeline: 0,
        overdue: 0, urgent: 0, newContacts: 0, totalContacts: 0,
        appointments: [],
      })

      // When
      const result = await service.getKpis(COMMERCIAL_ID, 'commercial')

      // Then — aucune valeur invalide
      const numericFields: (keyof KpiResult)[] = [
        'revenue_this_month', 'conversion_rate', 'pipeline_total',
        'total_contacts', 'new_contacts', 'overdue_tasks', 'urgent_tasks',
      ]
      numericFields.forEach(field => {
        expect(result[field]).not.toBeNaN()
        expect(result[field]).not.toBeUndefined()
        expect(typeof result[field]).toBe('number')
      })
    })
  })
})
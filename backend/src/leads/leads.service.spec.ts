// ============================================================
// leads/leads.service.spec.ts
// Tests unitaires du LeadsService
// ============================================================

import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { LeadsService } from './leads.service'
import { EmailService } from '../email/email.service'

// ── Mock du module base de données ──────────────────────────
jest.mock('../database/db.config', () => ({
  db: {
    select:  jest.fn(),
    insert:  jest.fn(),
    update:  jest.fn(),
    delete:  jest.fn(),
    execute: jest.fn(),
  },
}))

import { db } from '../database/db.config'

// ── Helpers ──────────────────────────────────────────────────
const mockUser = {
  admin:       { id: 'admin-uuid',      role: 'admin'       as const },
  commercial:  { id: 'commercial-uuid', role: 'commercial'  as const },
  utilisateur: { id: 'user-uuid',       role: 'utilisateur' as const },
}

const mockLead = {
  id:                  'lead-uuid-1',
  title:               'Opportunité Test',
  status:              'nouveau' as const,
  value:               '15000.00',
  probability:         30,
  expected_close_date: '2025-06-30',
  contact_id:          'contact-uuid-1',
  company_id:          'company-uuid-1',
  assigned_to:         'commercial-uuid',
  source:              'Site web',
  lost_reason:         null,
  notes:               'Notes de test',
  created_by:          'admin-uuid',
  created_at:          new Date('2025-01-01'),
  updated_at:          new Date('2025-01-15'),
}

// ── Mock chaîné pour queries simples (findOne, create…) ──────
// Ces queries finissent sur .limit() → resolve
function selectLimitChain(resolved: any) {
  return {
    from:     jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where:    jest.fn().mockReturnThis(),
    orderBy:  jest.fn().mockReturnThis(),
    limit:    jest.fn().mockResolvedValue(resolved),
  }
}

// ── Mock pour findAll — deux appels db.select successifs ─────
//
// 1er appel — query données    : chaîne se terminant par .offset()
// 2ème appel — query count(*)  : db.select({ count }).from(leads).where(clause)
//              → PAS de .limit() ni .offset(), donc .where() doit être thenable.
//
function makeSelectForFindAll(dataRows: any[], countValue: number) {
  let callIndex = 0

  ;(db.select as jest.Mock).mockImplementation(() => {
    callIndex++

    if (callIndex === 1) {
      return {
        from:     jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where:    jest.fn().mockReturnThis(),
        orderBy:  jest.fn().mockReturnThis(),
        limit:    jest.fn().mockReturnThis(),
        offset:   jest.fn().mockResolvedValue(dataRows),
      }
    }

    // Query count : .where() retourne une Promise directement
    return {
      from:  jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ count: countValue }]),
    }
  })
}

// ════════════════════════════════════════════════════════════
// Suite principale
// ════════════════════════════════════════════════════════════
describe('LeadsService', () => {
  let service: LeadsService
  let emailService: jest.Mocked<EmailService>

  // Supprime le bruit console des fire-and-forget attendus
  beforeAll(() => { jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterAll(() => { (console.error as jest.Mock).mockRestore() })

  beforeEach(async () => {
    const mockEmailService = {
      sendLeadAssigned:     jest.fn().mockResolvedValue(undefined),
      sendDealStageChanged: jest.fn().mockResolvedValue(undefined),
      sendTaskAssigned:     jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile()

    service      = module.get<LeadsService>(LeadsService)
    emailService = module.get(EmailService)

    jest.clearAllMocks()
  })

  // ── findAll ───────────────────────────────────────────────
  describe('findAll()', () => {
    it('lève ForbiddenException si role = utilisateur', async () => {
      await expect(service.findAll(mockUser.utilisateur, {}))
        .rejects.toThrow(ForbiddenException)
    })

    it('retourne une liste paginée pour un admin', async () => {
      makeSelectForFindAll([mockLead], 1)

      const result = await service.findAll(mockUser.admin, { page: 1, limit: 20 })

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('pagination')
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
      expect(result.data).toEqual([mockLead])
    })

    it('un commercial ne voit que ses leads (filtre assigned_to)', async () => {
      makeSelectForFindAll([mockLead], 1)

      const result = await service.findAll(mockUser.commercial, {})

      expect(result.data).toBeDefined()
      expect(db.select).toHaveBeenCalled()
    })

    it('applique les filtres search et status', async () => {
      makeSelectForFindAll([], 0)

      const result = await service.findAll(mockUser.admin, {
        search: 'Opportunité',
        status: 'nouveau',
        page:   1,
        limit:  10,
      })

      expect(result.pagination.total).toBe(0)
      expect(result.data).toHaveLength(0)
    })

    it('respecte la pagination — page 2, limit 5', async () => {
      makeSelectForFindAll([], 12)

      const result = await service.findAll(mockUser.admin, { page: 2, limit: 5 })

      expect(result.pagination.page).toBe(2)
      expect(result.pagination.limit).toBe(5)
      expect(result.pagination.totalPages).toBe(Math.ceil(12 / 5))
    })
  })

  // ── findOne ───────────────────────────────────────────────
  describe('findOne()', () => {
    it('lève ForbiddenException si role = utilisateur', async () => {
      await expect(service.findOne('lead-uuid-1', mockUser.utilisateur))
        .rejects.toThrow(ForbiddenException)
    })

    it('lève NotFoundException si le lead est absent', async () => {
      ;(db.select as jest.Mock).mockReturnValue(selectLimitChain([]))

      await expect(service.findOne('unknown-uuid', mockUser.admin))
        .rejects.toThrow(NotFoundException)
    })

    it('retourne le lead pour un admin', async () => {
      const row = { leads: mockLead, contacts: null, companies: null, profiles: null }
      ;(db.select as jest.Mock).mockReturnValue(selectLimitChain([row]))

      const result = await service.findOne('lead-uuid-1', mockUser.admin)
      expect(result).toEqual(row)
    })

    it('lève ForbiddenException si le commercial accède à un lead non assigné', async () => {
      const row = {
        leads: { ...mockLead, assigned_to: 'autre-commercial-uuid' },
        contacts: null, companies: null, profiles: null,
      }
      ;(db.select as jest.Mock).mockReturnValue(selectLimitChain([row]))

      await expect(service.findOne('lead-uuid-1', mockUser.commercial))
        .rejects.toThrow(ForbiddenException)
    })

    it("retourne le lead si le commercial est l'assigné", async () => {
      const row = {
        leads: { ...mockLead, assigned_to: 'commercial-uuid' },
        contacts: null, companies: null, profiles: null,
      }
      ;(db.select as jest.Mock).mockReturnValue(selectLimitChain([row]))

      const result = await service.findOne('lead-uuid-1', mockUser.commercial)
      expect(result.leads.id).toBe('lead-uuid-1')
    })
  })

  // ── create ────────────────────────────────────────────────
  describe('create()', () => {
    const createDto = {
      title:       'Nouveau Lead',
      status:      'nouveau' as const,
      value:       5000,
      probability: 20,
      assigned_to: 'commercial-uuid',
      contact_id:  'contact-uuid-1',
    }

    beforeEach(() => {
      ;(db.insert as jest.Mock).mockReturnValue({
        values:    jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockLead]),
      })
      // select pour récupérer le contact (fire-and-forget)
      ;(db.select as jest.Mock).mockReturnValue(
        selectLimitChain([{ first_name: 'Jean', last_name: 'Dupont' }]),
      )
    })

    it('crée le lead et retourne le nouvel enregistrement', async () => {
      const result = await service.create(createDto, 'admin-uuid')
      expect(result).toEqual(mockLead)
      expect(db.insert).toHaveBeenCalled()
    })

    it("déclenche l'email sendLeadAssigned si assigned_to est défini", async () => {
      await service.create(createDto, 'admin-uuid')
      await new Promise(r => setImmediate(r))
      expect(emailService.sendLeadAssigned).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId:  mockLead.assigned_to,
          leadId:      mockLead.id,
          leadTitle:   mockLead.title,
          createdById: 'admin-uuid',
        }),
      )
    })

    it('ne plante pas si sendLeadAssigned rejette (fire-and-forget)', async () => {
      emailService.sendLeadAssigned.mockRejectedValueOnce(new Error('SMTP error'))
      await expect(service.create(createDto, 'admin-uuid')).resolves.toBeDefined()
      await new Promise(r => setImmediate(r))
    })

    it("n'envoie pas d'email si assigned_to est absent", async () => {
      ;(db.insert as jest.Mock).mockReturnValue({
        values:    jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockLead, assigned_to: null }]),
      })

      await service.create({ ...createDto, assigned_to: undefined }, 'admin-uuid')
      await new Promise(r => setImmediate(r))
      expect(emailService.sendLeadAssigned).not.toHaveBeenCalled()
    })

    it('utilise userId comme assigned_to par défaut si non fourni', async () => {
      const dtoSansAssignee = { title: 'Test', value: 1000 }
      await service.create(dtoSansAssignee as any, 'admin-uuid')

      const insertCall = (db.insert as jest.Mock).mock.results[0].value
      expect(insertCall.values).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_to: 'admin-uuid' }),
      )
    })
  })

  // ── update ────────────────────────────────────────────────
  describe('update()', () => {
    beforeEach(() => {
      ;(db.select as jest.Mock).mockReturnValue(
        selectLimitChain([{
          leads:    { ...mockLead, assigned_to: 'commercial-uuid' },
          contacts: null, companies: null, profiles: null,
        }]),
      )
      ;(db.update as jest.Mock).mockReturnValue({
        set:       jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockLead, title: 'Mis à jour' }]),
      })
    })

    it('lève ForbiddenException si role = utilisateur', async () => {
      await expect(service.update('lead-uuid-1', { title: 'X' }, mockUser.utilisateur))
        .rejects.toThrow(ForbiddenException)
    })

    it("met à jour le lead et retourne l'enregistrement modifié", async () => {
      const result = await service.update('lead-uuid-1', { title: 'Mis à jour' }, mockUser.admin)
      expect(result.title).toBe('Mis à jour')
    })

    it('convertit value en string avant la mise à jour', async () => {
      await service.update('lead-uuid-1', { value: 9999 }, mockUser.admin)
      const updateCall = (db.update as jest.Mock).mock.results[0].value
      expect(updateCall.set).toHaveBeenCalledWith(
        expect.objectContaining({ value: '9999' }),
      )
    })
  })

  // ── remove ────────────────────────────────────────────────
  describe('remove()', () => {
    it('lève ForbiddenException si role != admin', async () => {
      await expect(service.remove('lead-uuid-1', mockUser.commercial))
        .rejects.toThrow(ForbiddenException)
    })

    it("lève NotFoundException si le lead n'existe pas", async () => {
      ;(db.delete as jest.Mock).mockReturnValue({
        where:     jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      })

      await expect(service.remove('unknown-uuid', mockUser.admin))
        .rejects.toThrow(NotFoundException)
    })

    it('supprime le lead et retourne le message de confirmation', async () => {
      ;(db.delete as jest.Mock).mockReturnValue({
        where:     jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'lead-uuid-1' }]),
      })

      const result = await service.remove('lead-uuid-1', mockUser.admin)
      expect(result).toEqual({ message: 'Lead supprimé avec succès', id: 'lead-uuid-1' })
    })
  })

  // ── getStats ──────────────────────────────────────────────
  describe('getStats()', () => {
    it('retourne les statistiques correctement formatées', async () => {
      ;(db.execute as jest.Mock).mockResolvedValue({
        rows: [{
          total:          '10',
          won:            '3',
          lost:           '2',
          revenue_won:    '45000',
          pipeline_value: '120000',
          new_this_month: '4',
        }],
      })

      const stats = await service.getStats('admin-uuid', 'admin')
      expect(stats.total).toBe(10)
      expect(stats.won).toBe(3)
      expect(stats.conversion_rate).toBe(30) // 3/10 * 100
      expect(stats.revenue_won).toBe(45000)
    })

    it('calcule un taux de conversion à 0 si total = 0', async () => {
      ;(db.execute as jest.Mock).mockResolvedValue({
        rows: [{
          total: '0', won: '0', lost: '0',
          revenue_won: '0', pipeline_value: '0', new_this_month: '0',
        }],
      })

      const stats = await service.getStats('commercial-uuid', 'commercial')
      expect(stats.conversion_rate).toBe(0)
    })
  })
})
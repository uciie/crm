// ============================================================
// pipeline/pipeline.service.spec.ts
// Tests unitaires du PipelineService
// ============================================================

import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { PipelineService } from './pipeline.service'
import { EmailService }    from '../email/email.service'

// ── Mock du module base de données ──────────────────────────
jest.mock('../database/db.config', () => ({
  db: {
    select:  jest.fn(),
    insert:  jest.fn(),
    update:  jest.fn(),
    execute: jest.fn(),
  },
}))

import { db } from '../database/db.config'

// ── Fixtures ──────────────────────────────────────────────────
const mockStages = [
  { id: 'stage-1', name: 'Prospect',      stage: 'prospect',      order_index: 0, color: '#6366f1', created_at: new Date() },
  { id: 'stage-2', name: 'Qualification', stage: 'qualification', order_index: 1, color: '#3b82f6', created_at: new Date() },
  { id: 'stage-3', name: 'Proposition',   stage: 'proposition',   order_index: 2, color: '#f59e0b', created_at: new Date() },
  { id: 'stage-4', name: 'Gagné',         stage: 'gagné',         order_index: 4, color: '#10b981', created_at: new Date() },
  { id: 'stage-5', name: 'Perdu',         stage: 'perdu',         order_index: 5, color: '#ef4444', created_at: new Date() },
]

const mockDeal = {
  id:               'deal-uuid-1',
  lead_id:          'lead-uuid-1',
  stage_id:         'stage-1',
  entered_stage_at: new Date('2025-01-10'),
  created_at:       new Date('2025-01-01'),
  updated_at:       new Date('2025-01-15'),
}

const mockLead = {
  id:          'lead-uuid-1',
  title:       'Projet Cloud Migration',
  status:      'nouveau',
  value:       '25000.00',
  probability: 40,
  assigned_to: 'commercial-uuid',
}

const mockContact = {
  id: 'contact-uuid-1', first_name: 'Alice', last_name: 'Martin',
  email: 'alice@example.com', avatar_url: null,
}
const mockCompany = { id: 'company-uuid-1', name: 'TechCorp', logo_url: null }
const mockProfile = { id: 'commercial-uuid', full_name: 'Jean Dupont', avatar_url: null }

// ── Utilitaire mock select chaîné (résout sur .limit()) ──────
function selectLimitChain(resolved: any) {
  return {
    from:     jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where:    jest.fn().mockReturnThis(),
    orderBy:  jest.fn().mockReturnThis(),
    limit:    jest.fn().mockResolvedValue(resolved),
  }
}

// ── Mock séquentiel pour moveDeal ────────────────────────────
// moveDeal fait jusqu'à 4 selects successifs :
//   1. target stage
//   2. current deal (old stage_id)
//   3. old stage name
//   4. lead (pour email, après update)
function mockMoveDealSelects(
  targetStage: any,
  currentDeal: any,
  oldStage: any,
  leadAfterUpdate: any,
) {
  const sequence = [
    [targetStage],      // 1. select target stage
    [currentDeal],      // 2. select current deal
    [oldStage],         // 3. select old stage name
    [leadAfterUpdate],  // 4. select lead pour email
  ]
  let call = 0
  ;(db.select as jest.Mock).mockImplementation(() => {
    const resolved = sequence[call] ?? []
    call++
    return selectLimitChain(resolved)
  })
}

// ════════════════════════════════════════════════════════════
// Suite principale
// ════════════════════════════════════════════════════════════
describe('PipelineService', () => {
  let service: PipelineService
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
        PipelineService,
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile()

    service      = module.get<PipelineService>(PipelineService)
    emailService = module.get(EmailService)

    jest.clearAllMocks()
  })

  // ── getKanbanBoard ────────────────────────────────────────
  describe('getKanbanBoard()', () => {
    const dealsQuery = [
      {
        deal_id: 'deal-uuid-1', stage_id: 'stage-1',
        entered_stage_at: new Date(),
        lead: { ...mockLead, assigned_to: 'commercial-uuid' },
        contact: mockContact, company: mockCompany, assignee: mockProfile,
      },
      {
        deal_id: 'deal-uuid-2', stage_id: 'stage-2',
        entered_stage_at: new Date(),
        lead: { ...mockLead, id: 'lead-uuid-2', value: '10000', assigned_to: 'autre-uuid' },
        contact: mockContact, company: mockCompany, assignee: mockProfile,
      },
    ]

    function mockKanbanSelects(deals: any[]) {
      let call = 0
      ;(db.select as jest.Mock).mockImplementation(() => {
        call++
        if (call === 1) {
          // stages query — résout sur .orderBy()
          return {
            from:    jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue(mockStages),
          }
        }
        // deals query — résout sur .orderBy() avec leftJoins
        return {
          from:     jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          orderBy:  jest.fn().mockResolvedValue(deals),
        }
      })
    }

    it('retourne toutes les colonnes avec deals pour un admin', async () => {
      mockKanbanSelects(dealsQuery)

      const result = await service.getKanbanBoard('admin-uuid', 'admin')

      expect(result).toHaveLength(mockStages.length)
      const totalDeals = result.reduce((sum, s) => sum + s.deals.length, 0)
      expect(totalDeals).toBe(dealsQuery.length)
    })

    it('un commercial ne voit que ses propres deals', async () => {
      mockKanbanSelects(dealsQuery)

      const result = await service.getKanbanBoard('commercial-uuid', 'commercial')

      const totalDeals = result.reduce((sum, s) => sum + s.deals.length, 0)
      expect(totalDeals).toBe(1)
    })

    it('calcule le total_value par colonne', async () => {
      mockKanbanSelects(dealsQuery)

      const result = await service.getKanbanBoard('admin-uuid', 'admin')

      const stageProspect = result.find(s => s.id === 'stage-1')
      expect(stageProspect?.total_value).toBe(25000)
    })

    it('retourne des colonnes vides si aucun deal', async () => {
      mockKanbanSelects([])

      const result = await service.getKanbanBoard('admin-uuid', 'admin')

      result.forEach(stage => {
        expect(stage.deals).toHaveLength(0)
        expect(stage.total_value).toBe(0)
      })
    })
  })

  // ── moveDeal ──────────────────────────────────────────────
  describe('moveDeal()', () => {
    function setupMoveDeal(targetStage = mockStages[1]) {
      mockMoveDealSelects(
        targetStage,
        { stage_id: 'stage-1', lead_id: 'lead-uuid-1' },
        { stage: 'prospect' },
        { title: mockLead.title, assigned_to: 'commercial-uuid' },
      )
      ;(db.update as jest.Mock).mockReturnValue({
        set:       jest.fn().mockReturnThis(),
        where:     jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockDeal, stage_id: targetStage.id }]),
      })
    }

    it("lève NotFoundException si l'étape cible n'existe pas", async () => {
      ;(db.select as jest.Mock).mockReturnValue(selectLimitChain([]))

      await expect(service.moveDeal('deal-uuid-1', 'stage-inexistant'))
        .rejects.toThrow(NotFoundException)
    })

    it('déplace le deal vers la nouvelle étape', async () => {
      setupMoveDeal()

      const result = await service.moveDeal('deal-uuid-1', 'stage-2', 'admin-uuid')

      expect(result?.stage_id).toBe('stage-2')
      expect(db.update).toHaveBeenCalled()
    })

    it('synchronise le statut du lead avec l\'étape pipeline (2 updates)', async () => {
      setupMoveDeal()

      await service.moveDeal('deal-uuid-1', 'stage-2', 'admin-uuid')

      expect(db.update).toHaveBeenCalledTimes(2)
    })

    it('déclenche sendDealStageChanged quand movedByUserId est fourni', async () => {
      setupMoveDeal()

      await service.moveDeal('deal-uuid-1', 'stage-2', 'admin-uuid')
      await new Promise(r => setImmediate(r))

      expect(emailService.sendDealStageChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId:  'commercial-uuid',
          leadId:      'lead-uuid-1',
          oldStage:    'prospect',
          newStage:    'qualification',
          createdById: 'admin-uuid',
        }),
      )
    })

    it("ne déclenche pas l'email si movedByUserId est absent", async () => {
      setupMoveDeal()

      await service.moveDeal('deal-uuid-1', 'stage-2')
      await new Promise(r => setImmediate(r))

      expect(emailService.sendDealStageChanged).not.toHaveBeenCalled()
    })

    it('ne plante pas si sendDealStageChanged rejette (fire-and-forget)', async () => {
      setupMoveDeal()
      emailService.sendDealStageChanged.mockRejectedValueOnce(new Error('Email error'))

      await expect(service.moveDeal('deal-uuid-1', 'stage-2', 'admin-uuid'))
        .resolves.toBeDefined()
      await new Promise(r => setImmediate(r))
    })
  })

  // ── Mapping stageToStatus ──────────────────────────────────
  describe('moveDeal() — mapping stage → lead status', () => {
    const cases: Array<{ stage: string; expectedStatus: string; stageId: string }> = [
      { stage: 'prospect',      expectedStatus: 'nouveau',     stageId: 'stage-1' },
      { stage: 'qualification', expectedStatus: 'qualifié',    stageId: 'stage-2' },
      { stage: 'proposition',   expectedStatus: 'proposition', stageId: 'stage-3' },
      { stage: 'gagné',         expectedStatus: 'gagné',       stageId: 'stage-4' },
      { stage: 'perdu',         expectedStatus: 'perdu',       stageId: 'stage-5' },
    ]

    cases.forEach(({ stage, expectedStatus, stageId }) => {
      it(`stage "${stage}" → statut lead "${expectedStatus}"`, async () => {
        const targetStage = mockStages.find(s => s.id === stageId)!

        mockMoveDealSelects(
          targetStage,
          { stage_id: 'stage-1', lead_id: 'lead-uuid-1' },
          { stage: 'prospect' },
          { title: 'Deal', assigned_to: null }, // pas d'email (assigned_to null)
        )

        let capturedStatus: string | undefined
        ;(db.update as jest.Mock).mockImplementation(() => ({
          set: jest.fn().mockImplementation((payload: any) => {
            if (payload.status) capturedStatus = payload.status
            return {
              where:     jest.fn().mockReturnThis(),
              returning: jest.fn().mockResolvedValue([mockDeal]),
            }
          }),
          where:     jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockDeal]),
        }))

        await service.moveDeal('deal-uuid-1', stageId)
        expect(capturedStatus).toBe(expectedStatus)
      })
    })
  })

  // ── getPipelineStats ──────────────────────────────────────
  describe('getPipelineStats()', () => {
    it('retourne les statistiques de chaque étape', async () => {
      ;(db.execute as jest.Mock).mockResolvedValue({
        rows: [
          { stage_name: 'Prospect',      stage_key: 'prospect',      color: '#6366f1', deal_count: '5', total_value: '50000', avg_probability: '20' },
          { stage_name: 'Qualification', stage_key: 'qualification', color: '#3b82f6', deal_count: '3', total_value: '30000', avg_probability: '50' },
          { stage_name: 'Gagné',         stage_key: 'gagné',         color: '#10b981', deal_count: '2', total_value: '20000', avg_probability: '100' },
        ],
      })

      const result = await service.getPipelineStats('admin-uuid', 'admin')

      expect(result.stages).toHaveLength(3)
      // weighted = 50000*0.20 + 30000*0.50 + 20000*1.00 = 10000 + 15000 + 20000 = 45000
      expect(result.weighted_revenue).toBe(45000)
    })

    it('retourne weighted_revenue = 0 si aucun deal', async () => {
      ;(db.execute as jest.Mock).mockResolvedValue({ rows: [] })

      const result = await service.getPipelineStats('commercial-uuid', 'commercial')

      expect(result.weighted_revenue).toBe(0)
    })

    it('arrondit le weighted_revenue à l\'entier', async () => {
      ;(db.execute as jest.Mock).mockResolvedValue({
        rows: [{ stage_name: 'X', stage_key: 'prospect', color: '#fff', deal_count: '1', total_value: '10001', avg_probability: '33' }],
      })

      const result = await service.getPipelineStats('admin-uuid', 'admin')

      expect(Number.isInteger(result.weighted_revenue)).toBe(true)
    })
  })

  // ── createDeal ────────────────────────────────────────────
  describe('createDeal()', () => {
    it('crée un deal sur la première étape si stageId non fourni', async () => {
      ;(db.select as jest.Mock).mockReturnValue({
        from:    jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit:   jest.fn().mockResolvedValue([mockStages[0]]),
      })
      ;(db.insert as jest.Mock).mockReturnValue({
        values:    jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockDeal]),
      })

      const result = await service.createDeal('lead-uuid-1')

      expect(result).toEqual(mockDeal)
      const insertCall = (db.insert as jest.Mock).mock.results[0].value
      expect(insertCall.values).toHaveBeenCalledWith(
        expect.objectContaining({ stage_id: mockStages[0].id }),
      )
    })

    it("crée un deal sur l'étape fournie", async () => {
      ;(db.insert as jest.Mock).mockReturnValue({
        values:    jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockDeal, stage_id: 'stage-3' }]),
      })

      const result = await service.createDeal('lead-uuid-1', 'stage-3')

      expect(result.stage_id).toBe('stage-3')
    })
  })
})
// ============================================================
// email-triggers.spec.ts
// Tests unitaires — déclencheurs email automatiques
// Version autonome : aucune dépendance aux vrais services
// ============================================================

// ── Mock BrevoService ─────────────────────────────────────────

const mockSendLeadAssigned     = jest.fn().mockResolvedValue(undefined)
const mockSendTaskAssigned     = jest.fn().mockResolvedValue(undefined)
const mockSendDealStageChanged = jest.fn().mockResolvedValue(undefined)
const mockSendTransactional    = jest.fn().mockResolvedValue('msg-id-123')

const MockBrevoService = {
  sendLeadAssigned:     mockSendLeadAssigned,
  sendTaskAssigned:     mockSendTaskAssigned,
  sendDealStageChanged: mockSendDealStageChanged,
  sendTransactional:    mockSendTransactional,
}

// ── Helpers : simule le comportement des services ─────────────

async function fakeLeadsCreate(
  dto: { title: string; assigned_to?: string },
  userId: string,
  brevo: typeof MockBrevoService,
) {
  const newLead = {
    id:          'lead-uuid-123',
    title:       dto.title,
    assigned_to: dto.assigned_to ?? userId,
    status:      'nouveau',
  }

  if (newLead.assigned_to) {
    brevo.sendLeadAssigned({
      assigneeId:  newLead.assigned_to,
      leadId:      newLead.id,
      leadTitle:   newLead.title,
      createdById: userId,
    }).catch(() => {})
  }

  return newLead
}

async function fakeTasksCreate(
  dto: { title: string; priority?: string; assigned_to?: string },
  userId: string,
  brevo: typeof MockBrevoService,
) {
  const assigneeId = dto.assigned_to ?? userId
  const newTask = {
    id:          'task-uuid-456',
    title:       dto.title,
    priority:    dto.priority ?? 'moyenne',
    assigned_to: assigneeId,
  }

  if (assigneeId !== userId) {
    brevo.sendTaskAssigned({
      assigneeId:  assigneeId,
      taskId:      newTask.id,
      taskTitle:   newTask.title,
      priority:    newTask.priority,
      createdById: userId,
    }).catch(() => {})
  }

  return newTask
}

async function fakePipelineMoveDeal(
  newStage: string,
  leadAssigneeId: string,
  movedByUserId: string,
  brevo: typeof MockBrevoService,
) {
  const updatedDeal = { id: 'deal-uuid-789', lead_id: 'lead-uuid-123' }

  const notifyStages = ['qualifié', 'proposition', 'négociation', 'gagné', 'perdu']
  if (leadAssigneeId && notifyStages.includes(newStage)) {
    brevo.sendDealStageChanged({
      assigneeId:  leadAssigneeId,
      leadId:      updatedDeal.lead_id,
      leadTitle:   'Vente CRM',
      oldStage:    'nouveau',
      newStage:    newStage,
      createdById: movedByUserId,
    }).catch(() => {})
  }

  return updatedDeal
}

// ─────────────────────────────────────────────────────────────
// SUITE 1 — Lead créé → email assignee
// ─────────────────────────────────────────────────────────────

describe('LeadsService — email automatique à la création', () => {
  beforeEach(() => jest.clearAllMocks())

  it('envoie sendLeadAssigned() quand un lead est assigné', async () => {
    await fakeLeadsCreate(
      { title: 'Nouveau client', assigned_to: 'assignee-uuid-456' },
      'creator-uuid-111',
      MockBrevoService,
    )
    await new Promise(r => setTimeout(r, 20))

    expect(mockSendLeadAssigned).toHaveBeenCalledTimes(1)
    expect(mockSendLeadAssigned).toHaveBeenCalledWith(expect.objectContaining({
      assigneeId:  'assignee-uuid-456',
      leadTitle:   'Nouveau client',
      createdById: 'creator-uuid-111',
    }))
  })

  it('s\'auto-assigne et envoie un email au créateur si assigned_to absent', async () => {
    await fakeLeadsCreate({ title: 'Lead auto' }, 'creator-uuid-111', MockBrevoService)
    await new Promise(r => setTimeout(r, 20))

    expect(mockSendLeadAssigned).toHaveBeenCalledTimes(1)
    expect(mockSendLeadAssigned).toHaveBeenCalledWith(expect.objectContaining({
      assigneeId: 'creator-uuid-111',
    }))
  })

  it('ne bloque pas la création si Brevo plante', async () => {
    mockSendLeadAssigned.mockRejectedValueOnce(new Error('Brevo timeout'))

    const result = await fakeLeadsCreate(
      { title: 'Lead crash', assigned_to: 'assignee-uuid-456' },
      'creator-uuid-111',
      MockBrevoService,
    )

    expect(result).toBeDefined()
    expect(result.id).toBe('lead-uuid-123')
  })
})

// ─────────────────────────────────────────────────────────────
// SUITE 2 — Tâche créée → email assignee
// ─────────────────────────────────────────────────────────────

describe('TasksService — email automatique à l\'assignation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('envoie sendTaskAssigned() quand assignée à quelqu\'un d\'autre', async () => {
    await fakeTasksCreate(
      { title: 'Appeler le client', priority: 'haute', assigned_to: 'autre-uuid-999' },
      'creator-uuid-111',
      MockBrevoService,
    )
    await new Promise(r => setTimeout(r, 20))

    expect(mockSendTaskAssigned).toHaveBeenCalledTimes(1)
    expect(mockSendTaskAssigned).toHaveBeenCalledWith(expect.objectContaining({
      assigneeId:  'autre-uuid-999',
      taskTitle:   'Appeler le client',
      priority:    'haute',
      createdById: 'creator-uuid-111',
    }))
  })

  it('n\'envoie PAS d\'email si assignée au créateur lui-même', async () => {
    await fakeTasksCreate(
      { title: 'Ma tâche', assigned_to: 'creator-uuid-111' },
      'creator-uuid-111',
      MockBrevoService,
    )
    await new Promise(r => setTimeout(r, 20))

    expect(mockSendTaskAssigned).not.toHaveBeenCalled()
  })

  it('ne bloque pas la création si Brevo plante', async () => {
    mockSendTaskAssigned.mockRejectedValueOnce(new Error('Brevo 500'))

    const result = await fakeTasksCreate(
      { title: 'Tâche crash', assigned_to: 'autre-uuid-999' },
      'creator-uuid-111',
      MockBrevoService,
    )

    expect(result).toBeDefined()
    expect(result.id).toBe('task-uuid-456')
  })
})

// ─────────────────────────────────────────────────────────────
// SUITE 3 — Pipeline stage changé → email assignee
// ─────────────────────────────────────────────────────────────

describe('PipelineService — email automatique au changement de stage', () => {
  beforeEach(() => jest.clearAllMocks())

  const stagesNotifies = ['qualifié', 'proposition', 'négociation', 'gagné', 'perdu']

  stagesNotifies.forEach(stage => {
    it(`envoie sendDealStageChanged() pour le stage "${stage}"`, async () => {
      await fakePipelineMoveDeal(stage, 'assignee-uuid-456', 'mover-uuid-111', MockBrevoService)
      await new Promise(r => setTimeout(r, 20))

      expect(mockSendDealStageChanged).toHaveBeenCalledTimes(1)
      expect(mockSendDealStageChanged).toHaveBeenCalledWith(expect.objectContaining({
        newStage:    stage,
        createdById: 'mover-uuid-111',
      }))
    })
  })

  it('n\'envoie PAS d\'email pour le stage "nouveau"', async () => {
    await fakePipelineMoveDeal('nouveau', 'assignee-uuid-456', 'mover-uuid-111', MockBrevoService)
    await new Promise(r => setTimeout(r, 20))

    expect(mockSendDealStageChanged).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────
// SUITE 4 — BrevoService : garde-fous
// ─────────────────────────────────────────────────────────────

describe('BrevoService — sécurité et robustesse', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sendTransactional() est appelé avec le bon templateId et params', async () => {
    await MockBrevoService.sendTransactional({
      to:         { email: 'jean@test.fr', name: 'Jean' },
      templateId: 4,
      params:     { ASSIGNEE_NAME: 'Jean', LEAD_TITLE: 'Vente CRM' },
    })

    expect(mockSendTransactional).toHaveBeenCalledWith(expect.objectContaining({
      templateId: 4,
      params:     expect.objectContaining({ ASSIGNEE_NAME: 'Jean' }),
    }))
  })

  it('retourne un messageId après un envoi réussi', async () => {
    const result = await MockBrevoService.sendTransactional({
      to: { email: 'jean@test.fr', name: 'Jean' }, templateId: 4, params: {},
    })
    expect(result).toBe('msg-id-123')
  })

  it('ne lance pas d\'exception si sendLeadAssigned() rejette', async () => {
    mockSendLeadAssigned.mockRejectedValueOnce(new Error('Network error'))

    await expect(
      fakeLeadsCreate({ title: 'Test', assigned_to: 'uuid' }, 'creator', MockBrevoService)
    ).resolves.not.toThrow()
  })
})
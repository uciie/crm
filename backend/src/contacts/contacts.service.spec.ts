// @ts-nocheck
/// <reference types="jest" />
// ============================================================
// src/contacts/contacts.service.spec.ts
// Tests unitaires — ContactsService (NestJS + Drizzle ORM)
// Convention : Given-When-Then
// ============================================================

// ── Mocks déclarés AVANT jest.mock() ─────────────────────────

const mockReturning  = jest.fn()
const mockOffset     = jest.fn()
const mockLimit      = jest.fn()
const mockOrderBy    = jest.fn()
const mockWhere      = jest.fn()
const mockLeftJoin   = jest.fn()
const mockFrom       = jest.fn()
const mockSelect     = jest.fn()
const mockValues     = jest.fn()
const mockInsert     = jest.fn()
const mockSet        = jest.fn()
const mockUpdate     = jest.fn()
const mockDelete     = jest.fn()

// Mock séparé pour la requête COUNT dans findAll().
const mockWhereCount = jest.fn()
const mockFromCount  = jest.fn()

function buildChains() {
  // Chaîne requête principale
  mockSelect.mockReturnValue({ from: mockFrom })
  mockFrom.mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere })
  mockLeftJoin.mockReturnValue({ leftJoin: mockLeftJoin, where: mockWhere })
  mockWhere.mockReturnValue({
    orderBy:   mockOrderBy,
    limit:     mockLimit,
    returning: mockReturning,
    leftJoin:  mockLeftJoin,
  })
  mockOrderBy.mockReturnValue({ limit: mockLimit })
  mockLimit.mockReturnValue({ offset: mockOffset })

  // Chaîne COUNT (second db.select())
  mockFromCount.mockReturnValue({ where: mockWhereCount })

  // Chaîne INSERT
  mockInsert.mockReturnValue({ values: mockValues })
  mockValues.mockReturnValue({ returning: mockReturning })

  // Chaîne UPDATE
  mockUpdate.mockReturnValue({ set: mockSet })
  mockSet.mockReturnValue({ where: mockWhere })

  // Chaîne DELETE
  mockDelete.mockReturnValue({ where: mockWhere })
}

buildChains()

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}

// CORRECTIF : mock EmailService avec toutes les méthodes utilisées par ContactsService
const mockEmailService = {
  sendTransactional:      jest.fn().mockResolvedValue(undefined),
  sendWelcomeInvitation:  jest.fn().mockResolvedValue(undefined),
  addContactToList:       jest.fn().mockResolvedValue(undefined),
}

// ── jest.mock() ───────────────────────────────────────────────

jest.mock('../database/db.config', () => ({ db: mockDb }))
// CORRECTIF : Proxy dynamique pour que contacts.company_id etc. retournent
// des valeurs truthy (string non vide) → satisfait expect.anything()
jest.mock('../database/schema', () => ({
  contacts:  new Proxy({}, { get: (_, prop) => `contacts.${String(prop)}` }),
  companies: new Proxy({}, { get: (_, prop) => `companies.${String(prop)}` }),
  profiles:  new Proxy({}, { get: (_, prop) => `profiles.${String(prop)}` }),
  leads:     new Proxy({}, { get: (_, prop) => `leads.${String(prop)}` }),
}))
jest.mock('drizzle-orm', () => ({
  eq:     jest.fn((col, val) => ({ type: 'eq',    col, val })),
  ilike:  jest.fn((col, val) => ({ type: 'ilike', col, val })),
  and:    jest.fn((...conds) => ({ type: 'and',   conds })),
  or:     jest.fn((...conds) => ({ type: 'or',    conds })),
  desc:   jest.fn(col        => ({ type: 'desc',  col })),
  asc:    jest.fn(col        => ({ type: 'asc',   col })),
  isNull: jest.fn(col        => ({ type: 'isNull', col })),
  sql:    new Proxy(
    (strings, ...values) => ({ strings, values }),
    { apply: (_t, _ctx, args) => ({ strings: args[0], values: args.slice(1) }) }
  ),
}))

// ── Imports après les mocks ───────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException }   from '@nestjs/common'
import { ContactsService }     from './contacts.service'
import { EmailService }        from '../email/email.service'

// ── Fixtures ──────────────────────────────────────────────────

const ADMIN_ID   = 'aaaaaaaa-0000-0000-0000-000000000001'
const COMPANY_ID = 'cccccccc-0000-0000-0000-000000000001'
const CONTACT_ID = 'bbbbbbbb-0000-0000-0000-000000000001'

const ADMIN_USER       = { id: ADMIN_ID, role: 'admin' as const }
const COMMERCIAL_USER  = { id: ADMIN_ID, role: 'commercial' as const }

const CONTACT_FIXTURE = {
  id:            CONTACT_ID,
  first_name:    'Sophie',
  last_name:     'Bernard',
  email:         'sophie.bernard@acme.fr',
  phone:         '+33612345678',
  mobile:        null,
  job_title:     'Directrice commerciale',
  department:    'Ventes',
  company_id:    COMPANY_ID,
  avatar_url:    null,
  linkedin_url:  null,
  address:       null,
  city:          'Paris',
  country:       'France',
  is_subscribed: true,
  notes:         null,
  assigned_to:   ADMIN_ID,
  created_by:    ADMIN_ID,
  created_at:    new Date('2025-01-15T10:00:00Z'),
  updated_at:    new Date('2025-01-15T10:00:00Z'),
}

const COMPANY_FIXTURE = {
  id:       COMPANY_ID,
  name:     'Acme Corp',
  industry: 'Technologie',
}

// ── Helpers ───────────────────────────────────────────────────

function resolveReturning(row: Record<string, unknown>) {
  mockReturning.mockResolvedValueOnce([row])
}

function resolveSelectOne(rows: Record<string, unknown>[]) {
  mockLimit.mockResolvedValueOnce(rows)
}

/**
 * Simule findAll() qui appelle db.select() DEUX fois :
 *   1er appel → chaîne principale
 *   2e  appel → chaîne COUNT (terminal sur where)
 */
function resolveList(rows: Record<string, unknown>[], count = rows.length) {
  let callCount = 0
  mockSelect.mockImplementation(() => {
    callCount++
    if (callCount === 2) {
      mockFromCount.mockReturnValueOnce({ where: mockWhereCount })
      mockWhereCount.mockResolvedValueOnce([{ count: String(count) }])
      return { from: mockFromCount }
    }
    return { from: mockFrom }
  })
  mockOffset.mockResolvedValueOnce(rows)
}

// ── Suite principale ──────────────────────────────────────────

describe('ContactsService', () => {
  let service: ContactsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide:  EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile()

    service = module.get<ContactsService>(ContactsService)
    jest.clearAllMocks()

    // Réinitialise toutes les chaînes après clearAllMocks()
    buildChains()
    mockEmailService.sendTransactional.mockResolvedValue(undefined)
    mockEmailService.sendWelcomeInvitation.mockResolvedValue(undefined)
    mockEmailService.addContactToList.mockResolvedValue(undefined)
  })

  // ── create() ─────────────────────────────────────────────────

  describe('create()', () => {

    it('Given un DTO valide, When create() est appelé, Then insère le contact et retourne la ligne créée', async () => {
      // Arrange
      const dto = {
        first_name:    'Sophie',
        last_name:     'Bernard',
        email:         'sophie.bernard@acme.fr',
        phone:         '+33612345678',
        job_title:     'Directrice commerciale',
        company_id:    COMPANY_ID,
        is_subscribed: true,
      }
      resolveReturning(CONTACT_FIXTURE)

      // Act
      const result = await service.create(dto, ADMIN_ID)

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(expect.anything())
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Sophie',
          last_name:  'Bernard',
          email:      'sophie.bernard@acme.fr',
          company_id: COMPANY_ID,
          created_by: ADMIN_ID,
        })
      )
      expect(mockReturning).toHaveBeenCalled()
      expect(result).toEqual(CONTACT_FIXTURE)
    })

    it('Given un DTO avec company_id, When create() est appelé, Then le contact est bien lié à l entreprise', async () => {
      // Arrange
      const dto = {
        first_name: 'Marc',
        last_name:  'Leroy',
        email:      'marc.leroy@beta.fr',
        company_id: COMPANY_ID,
      }
      const expected = { ...CONTACT_FIXTURE, first_name: 'Marc', last_name: 'Leroy', email: 'marc.leroy@beta.fr' }
      resolveReturning(expected)

      // Act
      const result = await service.create(dto, ADMIN_ID)

      // Assert
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ company_id: COMPANY_ID })
      )
      expect(result.company_id).toBe(COMPANY_ID)
    })

    it('Given un DTO sans email, When create() est appelé, Then crée le contact sans envoyer d email de bienvenue', async () => {
      // Arrange
      const dto = { first_name: 'Julie', last_name: 'Martin' }
      const expected = { ...CONTACT_FIXTURE, email: null, first_name: 'Julie', last_name: 'Martin' }
      resolveReturning(expected)

      // Act
      const result = await service.create(dto, ADMIN_ID)

      // Assert
      expect(result.email).toBeNull()
      expect(mockEmailService.sendWelcomeInvitation).not.toHaveBeenCalled()
    })

    it('Given un DTO avec email, When create() est appelé, Then envoie un email de bienvenue via EmailService', async () => {
      // Arrange
      const dto = { first_name: 'Sophie', last_name: 'Bernard', email: 'sophie@acme.fr' }
      resolveReturning(CONTACT_FIXTURE)

      // Act
      await service.create(dto, ADMIN_ID)

      // Assert — le service doit appeler sendWelcomeInvitation avec le bon destinataire
      expect(mockEmailService.sendWelcomeInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: CONTACT_FIXTURE.email,
        })
      )
    })
  })

  // ── update() ─────────────────────────────────────────────────

  describe('update()', () => {

    it('Given des champs partiels, When update() est appelé par un admin, Then met à jour uniquement les champs fournis', async () => {
      // Arrange
      const patch   = { job_title: 'Directrice générale', city: 'Lyon' }
      const updated = { ...CONTACT_FIXTURE, ...patch, updated_at: new Date() }

      resolveSelectOne([{ contacts: CONTACT_FIXTURE, companies: null }])
      resolveReturning(updated)

      // Act
      const result = await service.update(CONTACT_ID, patch, ADMIN_USER)

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(expect.anything())
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          job_title:  'Directrice générale',
          city:       'Lyon',
          updated_at: expect.any(Date),
        })
      )
      expect(result.job_title).toBe('Directrice générale')
      expect(result.city).toBe('Lyon')
      expect(result.email).toBe(CONTACT_FIXTURE.email)
    })

    it('Given un id inexistant, When update() est appelé, Then lève une NotFoundException', async () => {
      // Arrange
      resolveSelectOne([])

      // Act & Assert
      await expect(service.update('id-inexistant', { city: 'Paris' }, ADMIN_USER))
        .rejects
        .toThrow(NotFoundException)
    })

    it('Given un patch avec company_id, When update() est appelé, Then modifie le lien vers l entreprise', async () => {
      // Arrange
      const newCompanyId = 'cccccccc-0000-0000-0000-000000000002'
      const updated = { ...CONTACT_FIXTURE, company_id: newCompanyId }

      resolveSelectOne([{ contacts: CONTACT_FIXTURE, companies: null }])
      resolveReturning(updated)

      // Act
      const result = await service.update(CONTACT_ID, { company_id: newCompanyId }, ADMIN_USER)

      // Assert
      expect(result.company_id).toBe(newCompanyId)
    })
  })

  // ── remove() ─────────────────────────────────────────────────

  describe('remove()', () => {

    it('Given un id valide, When remove() est appelé, Then supprime le contact et retourne un message de confirmation', async () => {
      // Arrange
      resolveReturning({ id: CONTACT_ID })

      // Act
      const result = await service.remove(CONTACT_ID)

      // Assert
      expect(mockDelete).toHaveBeenCalledWith(expect.anything())
      expect(result).toMatchObject({
        message: expect.stringContaining('supprimé'),
        id:      CONTACT_ID,
      })
    })

    it('Given un id inexistant, When remove() est appelé, Then lève une NotFoundException', async () => {
      // Arrange
      mockReturning.mockResolvedValueOnce([])

      // Act & Assert
      await expect(service.remove('id-inexistant'))
        .rejects
        .toThrow(NotFoundException)
    })

    it('Given un contact supprimé, When findOne() est rappelé avec le même id, Then lève une NotFoundException', async () => {
      // Arrange — la suppression réussit
      resolveReturning({ id: CONTACT_ID })
      await service.remove(CONTACT_ID)

      // Arrange — le SELECT suivant retourne un tableau vide
      resolveSelectOne([])

      // Act & Assert
      await expect(service.findOne(CONTACT_ID, ADMIN_USER))
        .rejects
        .toThrow(NotFoundException)
    })
  })

  // ── findAll() ── filtrage ─────────────────────────────────────

  describe('findAll() — filtrage', () => {

    it('Given une recherche textuelle, When findAll() est appelé avec search="Sophie", Then applique un filtre ilike sur nom et email', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])

      // Act
      await service.findAll(ADMIN_USER, { search: 'Sophie' })

      // Assert
      const { ilike, or } = require('drizzle-orm')
      expect(ilike).toHaveBeenCalled()
      expect(or).toHaveBeenCalled()
    })

    it('Given un filtre company_id, When findAll() est appelé, Then applique un filtre eq sur company_id', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])

      // Act
      await service.findAll(ADMIN_USER, { company_id: COMPANY_ID })

      // Assert
      const { eq } = require('drizzle-orm')
      expect(eq).toHaveBeenCalledWith(expect.anything(), COMPANY_ID)
    })

    it('Given un commercial, When findAll() est appelé, Then le filtre RLS assigned_to = userId est appliqué', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])

      // Act
      await service.findAll(COMMERCIAL_USER, {})

      // Assert
      const { eq, or, isNull } = require('drizzle-orm')
      expect(or).toHaveBeenCalled()
      expect(eq).toHaveBeenCalledWith(expect.anything(), COMMERCIAL_USER.id)
    })

    it('Given aucun filtre, When findAll() est appelé par un admin, Then retourne tous les contacts avec pagination', async () => {
      // Arrange
      const rows = [
        CONTACT_FIXTURE,
        { ...CONTACT_FIXTURE, id: 'bbbbbbbb-0000-0000-0000-000000000002', first_name: 'Marc' },
      ]
      resolveList(rows, 2)

      // Act
      const result = await service.findAll(ADMIN_USER, {})

      // Assert
      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('Given une recherche par email partiel, When findAll() est appelé, Then applique ilike avec le pattern %email%', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])

      // Act
      await service.findAll(ADMIN_USER, { search: 'acme.fr' })

      // Assert
      const { ilike } = require('drizzle-orm')
      expect(ilike).toHaveBeenCalledWith(expect.anything(), '%acme.fr%')
    })
  })

  // ── findOne() ─────────────────────────────────────────────────

  describe('findOne()', () => {

    it('Given un id valide, When findOne() est appelé, Then retourne le contact avec ses relations', async () => {
      // Arrange
      resolveSelectOne([{ contacts: CONTACT_FIXTURE, companies: COMPANY_FIXTURE }])

      // Act
      const result = await service.findOne(CONTACT_ID, ADMIN_USER)

      // Assert
      expect(result).toMatchObject({
        contacts: expect.objectContaining({
          id:         CONTACT_ID,
          first_name: 'Sophie',
          last_name:  'Bernard',
        }),
      })
    })

    it('Given un id inexistant, When findOne() est appelé, Then lève une NotFoundException', async () => {
      // Arrange
      resolveSelectOne([])

      // Act & Assert
      await expect(service.findOne('id-inexistant', ADMIN_USER))
        .rejects
        .toThrow(NotFoundException)
    })

    it('Given un contact lié à une entreprise, When findOne() est appelé, Then retourne le contact avec company_id renseigné', async () => {
      // Arrange
      resolveSelectOne([{ contacts: CONTACT_FIXTURE, companies: COMPANY_FIXTURE }])

      // Act
      const result = await service.findOne(CONTACT_ID, ADMIN_USER)

      // Assert
      expect(result.contacts.company_id).toBe(COMPANY_ID)
    })
  })
})
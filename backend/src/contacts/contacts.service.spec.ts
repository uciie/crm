// @ts-nocheck
/// <reference types="jest" />
// ============================================================
// src/contacts/contacts.service.spec.ts
// Tests unitaires — ContactsService
// Convention : Given-When-Then
// ============================================================

// ── Mock objects declares AVANT jest.mock() ──────────────────
//
// Regle Jest : seules les variables prefixees "mock" peuvent etre
// referencees dans une factory jest.mock() apres hoisting.
//
// Le service Contacts utilise le query builder Drizzle (.select().from()...)
// et non db.execute(). On mocke donc chaque methode de la chaine.

const mockReturning    = jest.fn()
const mockWhere        = jest.fn()
const mockLimit        = jest.fn()
const mockOffset       = jest.fn()
const mockOrderBy      = jest.fn()
const mockFrom         = jest.fn()
const mockSelect       = jest.fn()
const mockInsert       = jest.fn()
const mockValues       = jest.fn()
const mockUpdate       = jest.fn()
const mockSet          = jest.fn()
const mockDelete       = jest.fn()
const mockLeftJoin     = jest.fn()
const mockGroupBy      = jest.fn()
const mockExecute      = jest.fn()

// Chaque methode retourne `this` pour permettre le chainage.
// Les methodes terminales (.returning(), derniere .where() etc.)
// retournent la promesse configuree par le test.
mockSelect.mockReturnValue({ from: mockFrom })
mockFrom.mockReturnValue({
  where: mockWhere, leftJoin: mockLeftJoin, limit: mockLimit, orderBy: mockOrderBy,
})
mockLeftJoin.mockReturnValue({ where: mockWhere, leftJoin: mockLeftJoin })
mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, leftJoin: mockLeftJoin })
mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset })
mockOffset.mockReturnValue({ then: jest.fn() })
mockLimit.mockReturnValue({ offset: mockOffset })
mockInsert.mockReturnValue({ values: mockValues })
mockValues.mockReturnValue({ returning: mockReturning })
mockUpdate.mockReturnValue({ set: mockSet })
mockSet.mockReturnValue({ where: mockWhere })
mockWhere.mockReturnValue({ returning: mockReturning, limit: mockLimit, orderBy: mockOrderBy })
mockDelete.mockReturnValue({ where: mockWhere })
mockGroupBy.mockReturnValue({ then: jest.fn() })

const mockDb = {
  select:  mockSelect,
  insert:  mockInsert,
  update:  mockUpdate,
  delete:  mockDelete,
  execute: mockExecute,
}

// ── jest.mock() ───────────────────────────────────────────────

jest.mock('../database/db.config', () => ({ db: mockDb }))
jest.mock('../database/schema', () => ({
  contacts:  'contacts_table',
  companies: 'companies_table',
  profiles:  'profiles_table',
  leads:     'leads_table',
}))
jest.mock('drizzle-orm', () => ({
  eq:    jest.fn((col, val) => ({ type: 'eq', col, val })),
  ilike: jest.fn((col, val) => ({ type: 'ilike', col, val })),
  and:   jest.fn((...conds)  => ({ type: 'and', conds })),
  or:    jest.fn((...conds)  => ({ type: 'or',  conds })),
  desc:  jest.fn(col         => ({ type: 'desc', col })),
  asc:   jest.fn(col         => ({ type: 'asc',  col })),
  sql:   new Proxy(
    (strings, ...values) => ({ strings, values }),
    { apply: (_t, _ctx, args) => ({ strings: args[0], values: args.slice(1) }) }
  ),
}))

// ── Imports apres les mocks ───────────────────────────────────

import { Test, TestingModule }  from '@nestjs/testing'
import { NotFoundException }    from '@nestjs/common'
import { ContactsService }      from './contacts.service'

// ── Fixtures ─────────────────────────────────────────────────

const ADMIN_ID   = 'aaaaaaaa-0000-0000-0000-000000000001'
const COMPANY_ID = 'cccccccc-0000-0000-0000-000000000001'
const CONTACT_ID = 'bbbbbbbb-0000-0000-0000-000000000001'

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

/** Helper : configure mockReturning pour simuler un INSERT ou UPDATE */
function resolveReturning(row: Record<string, unknown>) {
  mockReturning.mockResolvedValueOnce([row])
}

/** Helper : configure mockLimit pour simuler un SELECT avec .limit() */
function resolveSelect(rows: Record<string, unknown>[]) {
  mockLimit.mockResolvedValueOnce(rows)
}

/** Helper : configure mockOffset pour simuler une liste paginee */
function resolveList(rows: Record<string, unknown>[]) {
  mockOffset.mockResolvedValueOnce(rows)
}

// ── Suite principale ──────────────────────────────────────────

describe('ContactsService', () => {
  let service: ContactsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactsService],
    }).compile()

    service = module.get<ContactsService>(ContactsService)
    jest.clearAllMocks()
  })

  // ── create() ───────────────────────────────────────────────

  describe('create()', () => {
    it('Given un DTO valide, When create() est appele, Then insere le contact et retourne la ligne cree', async () => {
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
      expect(mockInsert).toHaveBeenCalledWith('contacts_table')
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

    it('Given un DTO avec company_id, When create() est appele, Then le contact est bien lie a l entreprise', async () => {
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

    it('Given un DTO sans email, When create() est appele, Then cree le contact sans contrainte email unique', async () => {
      // Arrange
      const dto = { first_name: 'Julie', last_name: 'Martin' }
      const expected = { ...CONTACT_FIXTURE, email: null, first_name: 'Julie', last_name: 'Martin' }
      resolveReturning(expected)

      // Act
      const result = await service.create(dto, ADMIN_ID)

      // Assert
      expect(result.email).toBeNull()
    })
  })

  // ── update() ───────────────────────────────────────────────

  describe('update()', () => {
    it('Given des champs partiels, When update() est appele, Then met a jour uniquement les champs fournis', async () => {
      // Arrange
      const patch = { job_title: 'Directrice generale', city: 'Lyon' }
      const updated = { ...CONTACT_FIXTURE, ...patch, updated_at: new Date() }
      mockReturning.mockResolvedValueOnce([updated])

      // Act
      const result = await service.update(CONTACT_ID, patch)

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith('contacts_table')
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          job_title:  'Directrice generale',
          city:       'Lyon',
          updated_at: expect.any(Date),
        })
      )
      expect(result.job_title).toBe('Directrice generale')
      expect(result.city).toBe('Lyon')
      // Les champs non fournis restent inchanges
      expect(result.email).toBe(CONTACT_FIXTURE.email)
    })

    it('Given un id inexistant, When update() est appele, Then leve une NotFoundException', async () => {
      // Arrange
      mockReturning.mockResolvedValueOnce([])

      // Act & Assert
      await expect(service.update('id-inexistant', { city: 'Paris' }))
        .rejects
        .toThrow(NotFoundException)
    })

    it('Given un patch avec company_id, When update() est appele, Then modifie le lien vers l entreprise', async () => {
      // Arrange
      const newCompanyId = 'cccccccc-0000-0000-0000-000000000002'
      const updated = { ...CONTACT_FIXTURE, company_id: newCompanyId }
      mockReturning.mockResolvedValueOnce([updated])

      // Act
      const result = await service.update(CONTACT_ID, { company_id: newCompanyId })

      // Assert
      expect(result.company_id).toBe(newCompanyId)
    })
  })

  // ── remove() ───────────────────────────────────────────────

  describe('remove()', () => {
    it('Given un id valide, When remove() est appele, Then supprime le contact et retourne un message de confirmation', async () => {
      // Arrange
      mockReturning.mockResolvedValueOnce([{ id: CONTACT_ID }])

      // Act
      const result = await service.remove(CONTACT_ID)

      // Assert
      expect(mockDelete).toHaveBeenCalledWith('contacts_table')
      expect(result).toMatchObject({
        message: expect.stringContaining('supprimé'),
        id:      CONTACT_ID,
      })
    })

    it('Given un id inexistant, When remove() est appele, Then leve une NotFoundException', async () => {
      // Arrange
      mockReturning.mockResolvedValueOnce([])

      // Act & Assert
      await expect(service.remove('id-inexistant'))
        .rejects
        .toThrow(NotFoundException)
    })

    it('Given un contact supprime, When findOne() est rappele avec le meme id, Then leve une NotFoundException', async () => {
      // Arrange — la suppression reussit
      mockReturning.mockResolvedValueOnce([{ id: CONTACT_ID }])
      await service.remove(CONTACT_ID)

      // Arrange — le SELECT suivant retourne un tableau vide
      mockLimit.mockResolvedValueOnce([])

      // Act & Assert
      await expect(service.findOne(CONTACT_ID, ADMIN_ID, 'admin'))
        .rejects
        .toThrow(NotFoundException)
    })
  })

  // ── findAll() — filtrage ────────────────────────────────────

  describe('findAll() — filtrage', () => {
    it('Given une recherche textuelle, When findAll() est appele avec search="Sophie", Then applique un filtre ilike sur nom et email', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])
      // Deuxieme appel : COUNT pour la pagination
      mockExecute.mockResolvedValueOnce({ rows: [{ count: '1' }] })

      // Act
      await service.findAll({ search: 'Sophie' }, ADMIN_ID, 'admin')

      // Assert — drizzle-orm/or et ilike doivent etre appeles
      const { ilike, or } = require('drizzle-orm')
      expect(ilike).toHaveBeenCalled()
      expect(or).toHaveBeenCalled()
    })

    it('Given un filtre company_id, When findAll() est appele, Then applique un filtre eq sur company_id', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])
      mockExecute.mockResolvedValueOnce({ rows: [{ count: '1' }] })

      // Act
      await service.findAll({ company_id: COMPANY_ID }, ADMIN_ID, 'admin')

      // Assert
      const { eq } = require('drizzle-orm')
      expect(eq).toHaveBeenCalledWith('contacts_table', COMPANY_ID)
    })

    it('Given un commercial, When findAll() est appele, Then le filtre assigned_to = userId est applique', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])
      mockExecute.mockResolvedValueOnce({ rows: [{ count: '1' }] })

      // Act
      await service.findAll({}, ADMIN_ID, 'commercial')

      // Assert
      const { eq } = require('drizzle-orm')
      // eq doit avoir ete appele avec l'id du commercial
      expect(eq).toHaveBeenCalledWith(expect.anything(), ADMIN_ID)
    })

    it('Given aucun filtre, When findAll() est appele par un admin, Then retourne tous les contacts avec pagination', async () => {
      // Arrange
      const contacts = [
        CONTACT_FIXTURE,
        { ...CONTACT_FIXTURE, id: 'bbbbbbbb-0000-0000-0000-000000000002', first_name: 'Marc' },
      ]
      resolveList(contacts)
      mockExecute.mockResolvedValueOnce({ rows: [{ count: '2' }] })

      // Act
      const result = await service.findAll({}, ADMIN_ID, 'admin')

      // Assert
      expect(result.data).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })

    it('Given une recherche par email partiel, When findAll() est appele, Then retourne les contacts correspondants', async () => {
      // Arrange
      resolveList([CONTACT_FIXTURE])
      mockExecute.mockResolvedValueOnce({ rows: [{ count: '1' }] })

      // Act
      await service.findAll({ search: 'acme.fr' }, ADMIN_ID, 'admin')

      // Assert
      const { ilike } = require('drizzle-orm')
      expect(ilike).toHaveBeenCalledWith(expect.anything(), '%acme.fr%')
    })
  })

  // ── findOne() ──────────────────────────────────────────────

  describe('findOne()', () => {
    it('Given un id valide, When findOne() est appele, Then retourne le contact avec ses relations', async () => {
      // Arrange — SELECT contact
      resolveSelect([{ ...CONTACT_FIXTURE, company: COMPANY_FIXTURE }])

      // Act
      const result = await service.findOne(CONTACT_ID, ADMIN_ID, 'admin')

      // Assert
      expect(result).toMatchObject({
        id:         CONTACT_ID,
        first_name: 'Sophie',
        last_name:  'Bernard',
      })
    })

    it('Given un id inexistant, When findOne() est appele, Then leve une NotFoundException', async () => {
      // Arrange
      resolveSelect([])

      // Act & Assert
      await expect(service.findOne('id-inexistant', ADMIN_ID, 'admin'))
        .rejects
        .toThrow(NotFoundException)
    })

    it('Given un contact lie a une entreprise, When findOne() est appele, Then retourne le contact avec company_id renseigne', async () => {
      // Arrange
      resolveSelect([{ ...CONTACT_FIXTURE, company: COMPANY_FIXTURE }])

      // Act
      const result = await service.findOne(CONTACT_ID, ADMIN_ID, 'admin')

      // Assert
      expect(result.company_id).toBe(COMPANY_ID)
    })
  })
})
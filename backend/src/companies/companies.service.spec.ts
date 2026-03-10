// @ts-nocheck
/// <reference types="jest" />
// ============================================================
// src/companies/companies.service.spec.ts
// Tests unitaires — CompaniesService
// Convention : Given-When-Then
// ============================================================

// ── Mock objects declares AVANT jest.mock() ──────────────────

const mockReturning = jest.fn()
const mockWhere     = jest.fn()
const mockLimit     = jest.fn()
const mockOffset    = jest.fn()
const mockOrderBy   = jest.fn()
const mockFrom      = jest.fn()
const mockSelect    = jest.fn()
const mockInsert    = jest.fn()
const mockValues    = jest.fn()
const mockUpdate    = jest.fn()
const mockSet       = jest.fn()
const mockDelete    = jest.fn()
const mockGroupBy   = jest.fn()
const mockExecute   = jest.fn()

function buildChains() {
  mockSelect.mockReturnValue({ from: mockFrom })
  mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit, groupBy: mockGroupBy })
  mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning })
  mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset })
  mockLimit.mockReturnValue({ offset: mockOffset })
  mockInsert.mockReturnValue({ values: mockValues })
  mockValues.mockReturnValue({ returning: mockReturning })
  mockUpdate.mockReturnValue({ set: mockSet })
  mockSet.mockReturnValue({ where: mockWhere })
  mockDelete.mockReturnValue({ where: mockWhere })
  mockGroupBy.mockReturnValue({ then: jest.fn() })
}

buildChains()

const mockDb = {
  select:  mockSelect,
  insert:  mockInsert,
  update:  mockUpdate,
  delete:  mockDelete,
  execute: mockExecute,
}

// ── jest.mock() ───────────────────────────────────────────────

jest.mock('../database/db.config', () => ({ db: mockDb }))
// CORRECTIF : Proxy dynamique pour que companies.updated_at, contacts.company_id, etc.
// retournent des valeurs truthy → satisfait expect.anything()
jest.mock('../database/schema', () => ({
  companies: new Proxy({}, { get: (_, prop) => `companies.${String(prop)}` }),
  contacts:  new Proxy({}, { get: (_, prop) => `contacts.${String(prop)}` }),
  profiles:  new Proxy({}, { get: (_, prop) => `profiles.${String(prop)}` }),
}))
jest.mock('drizzle-orm', () => ({
  eq:    jest.fn((col, val) => ({ type: 'eq', col, val })),
  ilike: jest.fn((col, val) => ({ type: 'ilike', col, val })),
  and:   jest.fn((...conds)  => ({ type: 'and', conds })),
  or:    jest.fn((...conds)  => ({ type: 'or',  conds })),
  desc:  jest.fn(col         => ({ type: 'desc', col })),
  sql:   new Proxy(
    (strings, ...values) => ({ strings, values }),
    { apply: (_t, _ctx, args) => ({ strings: args[0], values: args.slice(1) }) }
  ),
}))

// ── Imports apres les mocks ───────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException }   from '@nestjs/common'
import { CompaniesService }    from './companies.service'

// ── Fixtures ─────────────────────────────────────────────────

const ADMIN_ID   = 'aaaaaaaa-0000-0000-0000-000000000001'
const COMPANY_ID = 'cccccccc-0000-0000-0000-000000000001'
const CONTACT_ID = 'bbbbbbbb-0000-0000-0000-000000000001'

const COMPANY_FIXTURE = {
  id:             COMPANY_ID,
  name:           'Acme Corp',
  domain:         'acme.fr',
  industry:       'Technologie',
  size:           '51-200',
  website:        'https://acme.fr',
  phone:          '+33140000000',
  city:           'Paris',
  country:        'France',
  logo_url:       null,
  annual_revenue: '5000000.00',
  notes:          null,
  created_by:     ADMIN_ID,
  created_at:     new Date('2025-01-10T09:00:00Z'),
  updated_at:     new Date('2025-01-10T09:00:00Z'),
}

const CONTACT_FIXTURES = [
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
    id:         'bbbbbbbb-0000-0000-0000-000000000002',
    first_name: 'Marc',
    last_name:  'Leroy',
    email:      'marc.leroy@acme.fr',
    job_title:  'Responsable technique',
    phone:      null,
    avatar_url: null,
  },
]

// ── Helper : simule findAll() qui fait 3 appels select() ─────
//
// 1er select : requête principale → from→where→orderBy→limit→offset (terminal)
// 2e  select : COUNT             → from→where (terminal sur where)
// 3e  select : contacts groupés  → from→groupBy (terminal)
function resolveCompanyList(rows, count = rows.length, contactCounts = []) {
  let calls = 0
  mockSelect.mockImplementation(() => {
    calls++
    if (calls === 2) {
      const mWhere = jest.fn().mockResolvedValue([{ count: String(count) }])
      const mFrom  = jest.fn().mockReturnValue({ where: mWhere })
      return { from: mFrom }
    }
    if (calls === 3) {
      const mGroupBy = jest.fn().mockResolvedValue(contactCounts)
      const mFrom    = jest.fn().mockReturnValue({ groupBy: mGroupBy })
      return { from: mFrom }
    }
    // 1er appel : chaîne principale
    return { from: mockFrom }
  })
  mockOffset.mockResolvedValueOnce(rows)
}

// ── Suite principale ──────────────────────────────────────────

describe('CompaniesService', () => {
  let service: CompaniesService

  beforeEach(async () => {
    jest.clearAllMocks()
    // CORRECTIF : reconstruire les chaînes après clearAllMocks()
    buildChains()

    const module: TestingModule = await Test.createTestingModule({
      providers: [CompaniesService],
    }).compile()

    service = module.get<CompaniesService>(CompaniesService)
  })

  // ── create() ───────────────────────────────────────────────

  describe('create()', () => {
    it('Given un DTO valide, When create() est appele, Then insere l entreprise et retourne la ligne cree', async () => {
      // Arrange
      const dto = {
        name:           'Acme Corp',
        domain:         'acme.fr',
        industry:       'Technologie',
        city:           'Paris',
        annual_revenue: 5000000,
      }
      mockReturning.mockResolvedValueOnce([COMPANY_FIXTURE])

      // Act
      const result = await service.create(dto, ADMIN_ID)

      // Assert
      expect(mockInsert).toHaveBeenCalledWith(expect.anything())
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          name:       'Acme Corp',
          domain:     'acme.fr',
          created_by: ADMIN_ID,
        })
      )
      expect(result).toEqual(COMPANY_FIXTURE)
    })

    it('Given un annual_revenue numerique, When create() est appele, Then le convertit en string pour Drizzle decimal', async () => {
      // Arrange
      const dto = { name: 'Beta Industries', annual_revenue: 1200000 }
      mockReturning.mockResolvedValueOnce([{ ...COMPANY_FIXTURE, name: 'Beta Industries', annual_revenue: '1200000.00' }])

      // Act
      await service.create(dto, ADMIN_ID)

      // Assert — Drizzle attend un string pour le type decimal
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ annual_revenue: '1200000' })
      )
    })

    it('Given un industry valide, When create() est appele, Then le cast en IndustryType est applique', async () => {
      // Arrange
      const dto = { name: 'Gamma SAS', industry: 'Finance' }
      mockReturning.mockResolvedValueOnce([{ ...COMPANY_FIXTURE, name: 'Gamma SAS', industry: 'Finance' }])

      // Act
      await service.create(dto, ADMIN_ID)

      // Assert
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ industry: 'Finance' })
      )
    })
  })

  // ── findOne() avec contacts associes ───────────────────────

  describe('findOne()', () => {
    it('Given un id valide, When findOne() est appele, Then retourne l entreprise avec ses contacts associes', async () => {
      // Arrange — premier SELECT : l entreprise
      mockLimit.mockResolvedValueOnce([COMPANY_FIXTURE])
      // Deuxieme SELECT : les contacts associes
      mockLimit.mockResolvedValueOnce(CONTACT_FIXTURES)

      // Act
      const result = await service.findOne(COMPANY_ID)

      // Assert
      expect(result).toMatchObject({
        id:   COMPANY_ID,
        name: 'Acme Corp',
      })
      expect(result.contacts).toHaveLength(2)
      expect(result.contacts[0]).toMatchObject({
        id:         CONTACT_ID,
        first_name: 'Sophie',
        last_name:  'Bernard',
      })
    })

    it('Given un id valide, When findOne() est appele, Then les contacts retournes sont bien lies a l entreprise via company_id', async () => {
      // Arrange
      mockLimit.mockResolvedValueOnce([COMPANY_FIXTURE])
      mockLimit.mockResolvedValueOnce(CONTACT_FIXTURES)

      // Act
      await service.findOne(COMPANY_ID)

      // Assert — eq doit avoir ete appele avec le company_id
      const { eq } = require('drizzle-orm')
      expect(eq).toHaveBeenCalledWith(expect.anything(), COMPANY_ID)
    })

    it('Given une entreprise sans contact, When findOne() est appele, Then retourne un tableau de contacts vide', async () => {
      // Arrange
      mockLimit.mockResolvedValueOnce([COMPANY_FIXTURE])
      mockLimit.mockResolvedValueOnce([])

      // Act
      const result = await service.findOne(COMPANY_ID)

      // Assert
      expect(result.contacts).toEqual([])
    })

    it('Given un id inexistant, When findOne() est appele, Then leve une NotFoundException', async () => {
      // Arrange
      mockLimit.mockResolvedValueOnce([])

      // Act & Assert
      await expect(service.findOne('id-inexistant'))
        .rejects
        .toThrow(NotFoundException)
    })
  })

  // ── update() ───────────────────────────────────────────────

  describe('update()', () => {
    it('Given un patch partiel, When update() est appele, Then met a jour uniquement les champs fournis', async () => {
      // Arrange
      const patch = { city: 'Lyon', size: '201-500' }
      const updated = { ...COMPANY_FIXTURE, ...patch, updated_at: new Date() }
      mockReturning.mockResolvedValueOnce([updated])

      // Act
      const result = await service.update(COMPANY_ID, patch)

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(expect.anything())
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          city:       'Lyon',
          size:       '201-500',
          updated_at: expect.any(Date),
        })
      )
      expect(result.city).toBe('Lyon')
    })

    it('Given un id inexistant, When update() est appele, Then leve une NotFoundException', async () => {
      // Arrange
      mockReturning.mockResolvedValueOnce([])

      // Act & Assert
      await expect(service.update('id-inexistant', { name: 'X' }))
        .rejects
        .toThrow(NotFoundException)
    })
  })

  // ── remove() ───────────────────────────────────────────────

  describe('remove()', () => {
    it('Given un id valide, When remove() est appele, Then supprime l entreprise et retourne un message de confirmation', async () => {
      // Arrange
      mockReturning.mockResolvedValueOnce([{ id: COMPANY_ID }])

      // Act
      const result = await service.remove(COMPANY_ID)

      // Assert
      expect(mockDelete).toHaveBeenCalledWith(expect.anything())
      expect(result).toMatchObject({
        message: expect.stringContaining('supprimée'),
        id:      COMPANY_ID,
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
  })

  // ── findAll() — filtrage ────────────────────────────────────

  describe('findAll() — filtrage', () => {
    it('Given un filtre search, When findAll() est appele, Then applique un ilike sur name et domain', async () => {
      // Arrange — resolveCompanyList gère les 3 appels select()
      resolveCompanyList([COMPANY_FIXTURE])

      // Act
      await service.findAll({ search: 'acme' })

      // Assert
      const { ilike, or } = require('drizzle-orm')
      expect(ilike).toHaveBeenCalledWith(expect.anything(), '%acme%')
      expect(or).toHaveBeenCalled()
    })

    it('Given un filtre industry, When findAll() est appele, Then applique un ilike sur industry', async () => {
      // Arrange
      resolveCompanyList([COMPANY_FIXTURE])

      // Act
      await service.findAll({ industry: 'Technologie' })

      // Assert
      const { ilike } = require('drizzle-orm')
      expect(ilike).toHaveBeenCalledWith(expect.anything(), '%Technologie%')
    })
  })

  // ── getStats() ─────────────────────────────────────────────

  describe('getStats()', () => {
    it('Given des donnees en base, When getStats() est appele, Then retourne total, new_this_month et by_industry', async () => {
      // Arrange
      // 1er select().from() — terminal directement (pas de where ni orderBy)
      // mockFrom retourne un thenable pour simuler await db.select().from(companies)
      mockFrom.mockReturnValueOnce({
        then: (resolve) => Promise.resolve(resolve([{ total: '12' }])),
      })

      // db.execute() pour la requête SQL brute by_industry
      mockExecute.mockResolvedValueOnce({
        rows: [
          { industry: 'Technologie', count: '5' },
          { industry: 'Finance',     count: '3' },
        ],
      })

      // 3e select().from().where() — where est terminal
      mockWhere.mockResolvedValueOnce([{ new_this_month: '2' }])

      // Act
      const result = await service.getStats()

      // Assert
      expect(result.total).toBe(12)
      expect(result.new_this_month).toBe(2)
      expect(result.by_industry).toHaveLength(2)
      expect(result.by_industry[0].industry).toBe('Technologie')
    })
  })
})
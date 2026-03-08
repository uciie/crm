// @ts-nocheck
/// <reference types="jest" />
// ============================================================
// src/contacts/contacts.service.spec.ts
// Tests unitaires — ContactsService (NestJS + Drizzle ORM)
// Convention : Given-When-Then
// ============================================================

// ── Mocks déclarés AVANT jest.mock() ─────────────────────────
//
// Règle Jest : seules les variables préfixées "mock" peuvent être
// référencées dans une factory jest.mock() après hoisting.
//
// ContactsService utilise le query builder Drizzle en chaîne :
//   db.select().from().leftJoin().leftJoin().where().orderBy().limit().offset()
//   db.select().from().where()          ← COUNT pour pagination
//   db.insert().values().returning()
//   db.update().set().where().returning()
//   db.delete().where().returning()
//
// Chaque mock retourne `this` (l'objet suivant dans la chaîne)
// SAUF les mocks terminaux qui retournent une Promise.

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
// PROBLÈME RÉSOLU : findAll() appelle db.select() DEUX fois :
//   1. Requête principale : select→from→leftJoin→leftJoin→where→orderBy→limit→offset
//   2. Requête COUNT      : select→from→where  (terminal sur where, pas de limit/offset)
//
// Si on utilise mockWhere.mockResolvedValueOnce() pour le COUNT, le PREMIER appel
// à where() (celui de la requête principale) consomme la valeur résolue et retourne
// une Promise au lieu de l'objet chaînable avec orderBy → TypeError.
//
// Solution : un mockFromCount et mockWhereCount dédiés, injectés via
// mockSelect.mockReturnValueOnce() pour le second appel à db.select().
const mockWhereCount = jest.fn()
const mockFromCount  = jest.fn()

function buildChains() {
  // Chaîne requête principale (liste paginée)
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

// CORRECTIF #2 : mock EmailService — ContactsService l'injecte via le constructeur.
// Sans le fournir dans le TestingModule, NestJS ne peut pas résoudre les dépendances
// → "Nest can't resolve dependencies of the ContactsService (?)".
// On crée un mock minimal avec sendTransactional() qui ne fait rien par défaut.
const mockEmailService = {
  sendTransactional: jest.fn().mockResolvedValue(undefined),
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

const ADMIN_USER = { id: ADMIN_ID, role: 'admin' as const }
const COMMERCIAL_USER = { id: ADMIN_ID, role: 'commercial' as const }

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

/** Simule un INSERT/UPDATE → .returning() résout avec [row] */
function resolveReturning(row: Record<string, unknown>) {
  mockReturning.mockResolvedValueOnce([row])
}

/** Simule un SELECT avec .limit(1) → résout avec rows (findOne) */
function resolveSelectOne(rows: Record<string, unknown>[]) {
  mockLimit.mockResolvedValueOnce(rows)
}

/**
 * Simule findAll() qui appelle db.select() DEUX fois :
 *   1er appel → chaîne principale : from → leftJoin → leftJoin → where → orderBy → limit → offset
 *   2e  appel → chaîne COUNT      : from → where (terminal)
 *
 * mockSelect.mockImplementation avec compteur d'appels :
 *   - appel 1 → { from: mockFrom }      (chaîne principale, where retourne orderBy etc.)
 *   - appel 2 → { from: mockFromCount } (chaîne COUNT, where résout une Promise)
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
    // CORRECTIF #3 : fournir EmailService dans les providers.
    // On utilise useValue avec le mock plutôt que la vraie classe pour éviter
    // toute dépendance transitive (HttpModule, ConfigService, etc.).
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
      // Pas d'email → sendTransactional ne doit pas être appelé
      expect(mockEmailService.sendTransactional).not.toHaveBeenCalled()
    })

    it('Given un DTO avec email, When create() est appelé, Then envoie un email de bienvenue via EmailService', async () => {
      // Arrange
      const dto = { first_name: 'Sophie', last_name: 'Bernard', email: 'sophie@acme.fr' }
      resolveReturning(CONTACT_FIXTURE)

      // Act
      await service.create(dto, ADMIN_ID)

      // Assert — le service doit appeler emailService.sendTransactional avec le bon destinataire
      expect(mockEmailService.sendTransactional).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.objectContaining({ email: CONTACT_FIXTURE.email }),
        })
      )
    })
  })

  // ── update() ─────────────────────────────────────────────────

  describe('update()', () => {

    it('Given des champs partiels, When update() est appelé par un admin, Then met à jour uniquement les champs fournis', async () => {
      // Arrange — findOne est appelé en premier dans update()
      const patch   = { job_title: 'Directrice générale', city: 'Lyon' }
      const updated = { ...CONTACT_FIXTURE, ...patch, updated_at: new Date() }

      // update() appelle d'abord findOne() → resolveSelectOne
      resolveSelectOne([{ contacts: CONTACT_FIXTURE, companies: null }])
      // Puis le UPDATE → returning
      resolveReturning(updated)

      // Act — CORRECTIF #4 : la vraie signature est update(id, dto, user: AuthUser)
      const result = await service.update(CONTACT_ID, patch, ADMIN_USER)

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith('contacts_table')
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
      // Arrange — findOne retourne vide → NotFoundException
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
      expect(mockDelete).toHaveBeenCalledWith('contacts_table')
      expect(result).toMatchObject({
        message: expect.stringContaining('supprimé'),
        id:      CONTACT_ID,
      })
    })

    it('Given un id inexistant, When remove() est appelé, Then lève une NotFoundException', async () => {
      // Arrange — returning retourne un tableau vide
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

      // Act & Assert — CORRECTIF #5 : la vraie signature est findOne(id, user: AuthUser)
      await expect(service.findOne(CONTACT_ID, ADMIN_USER))
        .rejects
        .toThrow(NotFoundException)
    })
  })

  // ── findAll() ── filtrage ─────────────────────────────────────

  describe('findAll() — filtrage', () => {

    it('Given une recherche textuelle, When findAll() est appelé avec search="Sophie", Then applique un filtre ilike sur nom et email', async () => {
      // Arrange — CORRECTIF #6 : findAll() fait 2 requêtes :
      // 1. La liste (offset terminal) → resolveList
      // 2. Le COUNT (select → from → where, terminal sur mockWhere ou mockLimit)
      // La chaîne COUNT est : select().from().where() — where() résout directement.
      resolveList([CONTACT_FIXTURE])

      // Act — CORRECTIF #7 : la vraie signature est findAll(user: AuthUser, filters)
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

      // Assert — le service applique or(eq(assigned_to, userId), isNull(assigned_to))
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
      // Arrange — la chaîne findOne est select→from→leftJoin→where→limit(1)
      resolveSelectOne([{ contacts: CONTACT_FIXTURE, companies: COMPANY_FIXTURE }])

      // Act
      const result = await service.findOne(CONTACT_ID, ADMIN_USER)

      // Assert — le service retourne le premier élément du tableau Drizzle
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
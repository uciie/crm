// @ts-nocheck
/// <reference types="jest" />
// ============================================================
// src/auth/auth.service.spec.ts
// Tests unitaires — AuthService
// Convention : Given-When-Then
// ============================================================

import { Test, TestingModule }                                       from '@nestjs/testing'
import { ConfigService }                                             from '@nestjs/config'
import { NotFoundException, ForbiddenException, ConflictException }  from '@nestjs/common'
import type { UpdateProfileDto }                                     from './auth.service'

// ── Mock objects déclarés AVANT jest.mock() ───────────────────
//
//  ⚠️  Règle Jest : seules les variables dont le nom commence par "mock"
//  peuvent être référencées dans une factory jest.mock() après hoisting.
//  C'est pourquoi TOUS les objets ci-dessous commencent par "mock".

const mockInviteUserByEmail = jest.fn()
const mockDeleteUser        = jest.fn()

const mockSupabaseAdmin = {
  auth: {
    admin: {
      inviteUserByEmail: mockInviteUserByEmail,
      deleteUser:        mockDeleteUser,
    },
  },
}

// Chaîne Drizzle fluente — les méthodes "terminales" (limit, returning, orderBy)
// restent de simples jest.fn() pour permettre mockResolvedValueOnce par test.
const mockDb = {
  select:             jest.fn().mockReturnThis(),
  from:               jest.fn().mockReturnThis(),
  where:              jest.fn().mockReturnThis(),
  limit:              jest.fn(),
  update:             jest.fn().mockReturnThis(),
  set:                jest.fn().mockReturnThis(),
  insert:             jest.fn().mockReturnThis(),
  values:             jest.fn().mockReturnThis(),
  returning:          jest.fn(),
  orderBy:            jest.fn(),
  onConflictDoUpdate: jest.fn().mockReturnThis(),
  delete:             jest.fn().mockReturnThis(),
}

// ── jest.mock() — hoistés automatiquement par ts-jest/babel-jest ─
//
//  Ces appels sont déplacés en haut du fichier par le compilateur,
//  AVANT les imports. Les factories sont des closures et s'exécutent
//  paresseusement (au premier require), à ce moment les variables
//  "mock*" sont déjà initialisées.

jest.mock('../database/db.config',  () => ({ db: mockDb }))
jest.mock('../database/schema',     () => ({ profiles: 'profiles_table' }))
jest.mock('drizzle-orm',            () => ({ eq: jest.fn((c: any, v: any) => ({ c, v })) }))
jest.mock('@supabase/supabase-js',  () => ({ createClient: jest.fn(() => mockSupabaseAdmin) }))

// ── Import après les mocks (ordre garanti par le hoisting) ───
import { AuthService } from './auth.service'

// ── Profil de test ────────────────────────────────────────────

const MOCK_PROFILE = {
  id:         'uuid-user-1',
  full_name:  'Alice Dupont',
  role:       'commercial' as const,
  phone:      '+33612345678',
  avatar_url: null,
  is_active:  true,
  created_at: new Date(),
  updated_at: new Date(),
}

// ── Suite principale ──────────────────────────────────────────

describe('AuthService', () => {
  let service: any

  beforeEach(async () => {
    // Remet à zéro les compteurs d'appels sans toucher aux implémentations
    // (mockReturnThis(), mockResolvedValueOnce(), etc. sont conservés)
    jest.clearAllMocks()

    // Ré-applique les chaînes fluentes sur les méthodes intermédiaires
    // car clearAllMocks() efface les implémentations par défaut
    mockDb.select.mockReturnThis()
    mockDb.from.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.update.mockReturnThis()
    mockDb.set.mockReturnThis()
    mockDb.insert.mockReturnThis()
    mockDb.values.mockReturnThis()
    mockDb.onConflictDoUpdate.mockReturnThis()
    mockDb.delete.mockReturnThis()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const map: Record<string, string> = {
                SUPABASE_URL:              'https://test.supabase.co',
                SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
                FRONTEND_URL:             'http://localhost:3000',
              }
              return map[key] ?? 'test-value'
            },
          },
        },
      ],
    }).compile()

    service = module.get<any>(AuthService)
  })

  // ── getProfile ──────────────────────────────────────────────

  describe('getProfile()', () => {
    it('Given a valid userId — When getProfile() is called — Then it returns the matching profile', async () => {
      // Given
      mockDb.limit.mockResolvedValueOnce([MOCK_PROFILE])

      // When
      const result = await service.getProfile('uuid-user-1')

      // Then
      expect(result).toEqual(MOCK_PROFILE)
      expect(result).not.toHaveProperty('password')
    })

    it('Given an unknown userId — When getProfile() is called — Then it throws NotFoundException', async () => {
      // Given — une seule invocation, deux assertions sur la même erreur capturée
      mockDb.limit.mockResolvedValueOnce([])

      // When
      let error: any
      try {
        await service.getProfile('uuid-unknown')
      } catch (e) {
        error = e
      }

      // Then — type et message vérifiés en une seule passe
      expect(error).toBeInstanceOf(NotFoundException)
      expect(error.message).toContain('Profil introuvable')
    })

    it('Given a profile response — When getProfile() is called — Then the response never contains a password field', async () => {
      // Given — simule une ligne DB qui aurait par erreur un champ password
      const dbRowWithPassword = { ...MOCK_PROFILE, password: 'hashed-secret' }
      mockDb.limit.mockResolvedValueOnce([dbRowWithPassword])

      // When
      const result = await service.getProfile('uuid-user-1')

      // Then — le schéma Drizzle ne sélectionne jamais password_hash
      expect(result).not.toHaveProperty('password_hash')
    })
  })

  // ── updateProfile ───────────────────────────────────────────

  describe('updateProfile()', () => {
    it('Given valid DTO — When updateProfile() is called — Then it returns the updated profile', async () => {
      // Given
      const dto: UpdateProfileDto = { full_name: 'Alice Martin', phone: '+33699999999' }
      const updated               = { ...MOCK_PROFILE, ...dto }
      mockDb.returning.mockResolvedValueOnce([updated])

      // When
      const result = await service.updateProfile('uuid-user-1', dto)

      // Then
      expect(result.full_name).toBe('Alice Martin')
      expect(result.phone).toBe('+33699999999')
    })

    it('Given unknown userId — When updateProfile() is called — Then it throws NotFoundException', async () => {
      // Given
      mockDb.returning.mockResolvedValueOnce([])

      // When / Then
      await expect(
        service.updateProfile('uuid-unknown', { full_name: 'Test' })
      ).rejects.toThrow(NotFoundException)
    })
  })

  // ── findAllUsers ────────────────────────────────────────────

  describe('findAllUsers()', () => {
    it('Given users in DB — When findAllUsers() is called — Then it returns a list without passwords', async () => {
      // Given
      const dbUsers = [
        MOCK_PROFILE,
        { ...MOCK_PROFILE, id: 'uuid-user-2', full_name: 'Bob Martin', role: 'admin' as const },
      ]
      mockDb.orderBy.mockResolvedValueOnce(dbUsers)

      // When
      const result = await service.findAllUsers()

      // Then
      expect(result).toHaveLength(2)
      result.forEach((u: any) => {
        expect(u).not.toHaveProperty('password')
        expect(u).not.toHaveProperty('password_hash')
      })
    })
  })

  // ── updateUserRole ──────────────────────────────────────────

  describe('updateUserRole()', () => {
    it('Given admin targeting another user — When updateUserRole() is called — Then it updates the role', async () => {
      // Given
      const updated = { ...MOCK_PROFILE, role: 'admin' as const }
      mockDb.returning.mockResolvedValueOnce([updated])

      // When
      const result = await service.updateUserRole('uuid-admin', 'uuid-user-1', 'admin')

      // Then
      expect(result.role).toBe('admin')
    })

    it('Given an admin targeting themselves — When updateUserRole() is called — Then it throws ForbiddenException', async () => {
      // Given / When / Then
      await expect(
        service.updateUserRole('uuid-admin', 'uuid-admin', 'utilisateur')
      ).rejects.toThrow(ForbiddenException)
      await expect(
        service.updateUserRole('uuid-admin', 'uuid-admin', 'utilisateur')
      ).rejects.toThrow('Vous ne pouvez pas modifier votre propre rôle.')
    })
  })

  // ── toggleUserActive ────────────────────────────────────────

  describe('toggleUserActive()', () => {
    it('Given admin disabling another user — When toggleUserActive(false) is called — Then it deactivates the user', async () => {
      // Given
      const deactivated = { ...MOCK_PROFILE, is_active: false }
      mockDb.returning.mockResolvedValueOnce([deactivated])

      // When
      const result = await service.toggleUserActive('uuid-admin', 'uuid-user-1', false)

      // Then
      expect(result.user.is_active).toBe(false)
      expect(result.message).toContain('désactivé')
    })

    it('Given an admin targeting themselves — When toggleUserActive() is called — Then it throws ForbiddenException', async () => {
      // Given / When / Then
      await expect(
        service.toggleUserActive('uuid-admin', 'uuid-admin', false)
      ).rejects.toThrow(ForbiddenException)
    })
  })

  // ── inviteUser ──────────────────────────────────────────────

  describe('inviteUser()', () => {
    it('Given valid inputs — When inviteUser() is called — Then it calls Supabase Admin API and inserts a profile', async () => {
      // Given
      const fakeUser = { id: 'uuid-new-user' }
      mockInviteUserByEmail.mockResolvedValueOnce({
        data: { user: fakeUser },
        error: null,
      })
      mockDb.onConflictDoUpdate.mockResolvedValueOnce([{ id: fakeUser.id }])

      // When
      const result = await service.inviteUser('new@crm.fr', 'Nouveau Utilisateur', 'commercial')

      // Then — le redirectTo passe par /auth/callback (PKCE flow)
      expect(mockInviteUserByEmail).toHaveBeenCalledWith(
        'new@crm.fr',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback?next=/update-password'),
        })
      )
      expect(result.message).toContain('new@crm.fr')
    })

    it('Given Supabase returns "already registered" error — When inviteUser() is called — Then it throws ConflictException', async () => {
      // Given
      mockInviteUserByEmail.mockResolvedValue({
        data:  { user: null },
        error: { message: 'User already registered', status: 422 },
      })

      // When / Then
      await expect(
        service.inviteUser('existing@crm.fr', 'Existant', 'commercial')
      ).rejects.toThrow(ConflictException)
      await expect(
        service.inviteUser('existing@crm.fr', 'Existant', 'commercial')
      ).rejects.toThrow('Cet email est déjà enregistré.')
    })

    it('Given a successful invite — When inviteUser() is called — Then the redirectTo URL encodes the next param correctly', async () => {
      // Given
      mockInviteUserByEmail.mockResolvedValueOnce({
        data:  { user: { id: 'uuid-x' } },
        error: null,
      })
      mockDb.onConflictDoUpdate.mockResolvedValueOnce([])

      // When
      await service.inviteUser('x@x.fr', 'X', 'utilisateur')

      // Then — le callback doit établir la session PKCE avant la redirection
      const callArgs = mockInviteUserByEmail.mock.calls[0]
      expect(callArgs[1].redirectTo).toMatch(/\/auth\/callback\?next=\/update-password/)
    })
  })

  // ── deleteUser ──────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('Given admin deleting another user — When deleteUser() is called — Then it calls Supabase Admin delete', async () => {
      // Given
      mockDeleteUser.mockResolvedValueOnce({ error: null })

      // When
      const result = await service.deleteUser('uuid-admin', 'uuid-user-1')

      // Then
      expect(mockDeleteUser).toHaveBeenCalledWith('uuid-user-1')
      expect(result.message).toBe('Utilisateur supprimé avec succès.')
    })

    it('Given admin targeting themselves — When deleteUser() is called — Then it throws ForbiddenException', async () => {
      // Given / When / Then
      await expect(
        service.deleteUser('uuid-admin', 'uuid-admin')
      ).rejects.toThrow(ForbiddenException)
    })

    it('Given Supabase returns an error — When deleteUser() is called — Then it throws ConflictException', async () => {
      // Given
      mockDeleteUser.mockResolvedValueOnce({
        error: { message: 'User not found' },
      })

      // When / Then
      await expect(
        service.deleteUser('uuid-admin', 'uuid-user-1')
      ).rejects.toThrow(ConflictException)
    })
  })
})
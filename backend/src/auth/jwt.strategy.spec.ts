// @ts-nocheck
/// <reference types="jest" />
// ============================================================
// src/auth/jwt.strategy.spec.ts
// Tests unitaires — JwtStrategy.validate()
// Convention : Given-When-Then
// ============================================================

import { UnauthorizedException } from '@nestjs/common'
import { ConfigService }         from '@nestjs/config'

// ── Mock objects déclarés AVANT jest.mock() ───────────────────
//
//  ⚠️  Règle Jest : seules les variables dont le nom commence par "mock"
//  peuvent être référencées dans une factory jest.mock() après hoisting.

// Chaîne Drizzle fluente — limit() est le point terminal mockable par test
const mockDbChain = {
  select: jest.fn().mockReturnThis(),
  from:   jest.fn().mockReturnThis(),
  where:  jest.fn().mockReturnThis(),
  limit:  jest.fn(),
}

// ── jest.mock() — hoistés automatiquement par ts-jest/babel-jest ─
//
//  Ces appels sont déplacés en tête de fichier par le compilateur,
//  avant les imports. Les factories sont des closures et s'exécutent
//  paresseusement (au premier require). À ce moment, les variables
//  "mock*" sont déjà initialisées.

jest.mock('../database/db.config', () => ({ db: mockDbChain }))
jest.mock('../database/schema',    () => ({ profiles: {} }))
jest.mock('drizzle-orm',           () => ({ eq: jest.fn((c: any, v: any) => ({ c, v })) }))

// ── Import après les mocks ────────────────────────────────────
import { JwtStrategy } from './jwt.strategy'

// ── JWT payload de référence ──────────────────────────────────

const VALID_PAYLOAD = {
  sub:   'uuid-user-001',
  email: 'test@crm.io',
  role:  'authenticated',
  exp:   Math.floor(Date.now() / 1000) + 3600,
  iat:   Math.floor(Date.now() / 1000),
  aud:   'authenticated',
}

const MOCK_PROFILE = {
  id:        'uuid-user-001',
  full_name: 'Jean Dupont',
  role:      'commercial',
  is_active: true,
}

// ─────────────────────────────────────────────────────────────

describe('JwtStrategy — validate()', () => {
  let strategy: JwtStrategy

  beforeEach(() => {
    // Remet à zéro les compteurs sans effacer les implémentations
    jest.clearAllMocks()

    // Ré-applique les chaînes fluentes (clearAllMocks efface les implémentations)
    mockDbChain.select.mockReturnThis()
    mockDbChain.from.mockReturnThis()
    mockDbChain.where.mockReturnThis()

    const configService = {
      getOrThrow: jest.fn().mockReturnValue('mock-jwt-secret'),
    } as unknown as ConfigService

    strategy = new JwtStrategy(configService)
  })

  // ── Succès ─────────────────────────────────────────────────

  describe('token valide', () => {
    it('devrait retourner un AuthUser complet quand le profil existe et est actif', async () => {
      // Given — payload JWT valide, profil actif en base
      mockDbChain.limit.mockResolvedValueOnce([MOCK_PROFILE])

      // When
      const result = await strategy.validate(VALID_PAYLOAD)

      // Then — AuthUser hydraté depuis la DB
      expect(result).toMatchObject({
        id:        MOCK_PROFILE.id,
        email:     VALID_PAYLOAD.email,
        role:      MOCK_PROFILE.role,
        full_name: MOCK_PROFILE.full_name,
        is_active: true,
      })
    })

    it('ne doit jamais inclure de mot de passe dans l AuthUser retourné', async () => {
      // Given — ligne DB contenant par erreur un champ sensible
      const profileWithPassword = { ...MOCK_PROFILE, password: 'should-never-appear' }
      mockDbChain.limit.mockResolvedValueOnce([profileWithPassword])

      // When
      const result = await strategy.validate(VALID_PAYLOAD)

      // Then — aucun champ sensible dans le résultat
      expect(result).not.toHaveProperty('password')
      expect(result).not.toHaveProperty('hashed_password')
    })
  })

  // ── Erreurs d authentification ──────────────────────────────

  describe('token invalide ou profil problématique', () => {
    it('devrait lever UnauthorizedException si le sub est absent du payload', async () => {
      // Given — payload sans subject
      const payloadSansSubject = { ...VALID_PAYLOAD, sub: undefined as any }

      // When / Then
      await expect(strategy.validate(payloadSansSubject)).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('devrait lever UnauthorizedException si le profil est introuvable en base', async () => {
      // Given — aucun profil correspondant au sub
      mockDbChain.limit.mockResolvedValueOnce([])

      // When / Then
      await expect(strategy.validate(VALID_PAYLOAD)).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('devrait lever UnauthorizedException si le compte est désactivé (is_active = false)', async () => {
      // Given — profil trouvé mais désactivé
      const profileInactif = { ...MOCK_PROFILE, is_active: false }
      mockDbChain.limit.mockResolvedValueOnce([profileInactif])

      // When / Then
      await expect(strategy.validate(VALID_PAYLOAD)).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('le message d erreur pour compte désactivé doit guider l utilisateur', async () => {
      // Given
      mockDbChain.limit.mockResolvedValueOnce([{ ...MOCK_PROFILE, is_active: false }])

      // When
      let error: UnauthorizedException | null = null
      try {
        await strategy.validate(VALID_PAYLOAD)
      } catch (e) {
        error = e as UnauthorizedException
      }

      // Then — message explicite contenant "désactivé"
      expect(error).not.toBeNull()
      expect(error!.message).toContain('désactivé')
    })
  })
})
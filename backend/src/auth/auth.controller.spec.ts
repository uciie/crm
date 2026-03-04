// ============================================================
// test/auth/auth.controller.spec.ts
// Tests d intégration — AuthController
// Convention : Given-When-Then
// ============================================================

import { Test, TestingModule }                       from '@nestjs/testing'
import { INestApplication, ValidationPipe }          from '@nestjs/common'
import request from 'supertest'
import { AuthController }                            from './auth.controller'
import { AuthService }                               from './auth.service'
import { JwtAuthGuard }                              from './jwt-auth.guard'
import { RolesGuard }                                from './roles.guard'
import type { AuthUser }                             from './types'

// ── Profils de test ───────────────────────────────────────────

const ADMIN_USER: AuthUser = {
  id: 'uuid-admin', email: 'admin@test.com', role: 'admin',
  full_name: 'Admin Test', is_active: true,
}

const COMMERCIAL_USER: AuthUser = {
  id: 'uuid-commercial', email: 'commercial@test.com', role: 'commercial',
  full_name: 'Commercial Test', is_active: true,
}

const MOCK_PROFILE = {
  id: 'uuid-admin', full_name: 'Admin Test', role: 'admin',
  phone: null, avatar_url: null, is_active: true,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}

// ── Mock AuthService ──────────────────────────────────────────

const mockAuthService = {
  getProfile:       jest.fn().mockResolvedValue(MOCK_PROFILE),
  updateProfile:    jest.fn().mockResolvedValue(MOCK_PROFILE),
  findAllUsers:     jest.fn().mockResolvedValue([MOCK_PROFILE]),
  inviteUser:       jest.fn().mockResolvedValue({ message: 'Invitation envoyée', userId: 'new-id' }),
  updateUserRole:   jest.fn().mockResolvedValue({ ...MOCK_PROFILE, role: 'commercial' }),
  toggleUserActive: jest.fn().mockResolvedValue({ message: 'Désactivé', user: MOCK_PROFILE }),
  deleteUser:       jest.fn().mockResolvedValue({ message: 'Supprimé' }),
}

// ── Guard factory ─────────────────────────────────────────────
// Permet de simuler différents utilisateurs authentifiés

function makeJwtGuard(user: AuthUser) {
  return {
    canActivate: jest.fn().mockImplementation((ctx) => {
      ctx.switchToHttp().getRequest().user = user
      return true
    }),
  }
}

// ─────────────────────────────────────────────────────────────

describe('AuthController — sécurité et réponses', () => {
  let app: INestApplication

  async function buildApp(user: AuthUser) {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers:   [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(makeJwtGuard(user))
      .overrideGuard(RolesGuard).useValue({
        canActivate: jest.fn().mockReturnValue(user.role === 'admin'),
      })
      .compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  }

  afterEach(async () => {
    await app?.close()
    jest.clearAllMocks()
  })

  // ── GET /auth/me ────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('devrait retourner le profil de l utilisateur connecté sans mot de passe', async () => {
      // Given — utilisateur admin authentifié
      await buildApp(ADMIN_USER)

      // When
      const res = await request(app.getHttpServer()).get('/auth/me')

      // Then — 200 et aucun champ sensible
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('full_name')
      expect(res.body).not.toHaveProperty('password')
      expect(res.body).not.toHaveProperty('encrypted_password')
      expect(res.body).not.toHaveProperty('password_hash')
    })
  })

  // ── GET /auth/users ─────────────────────────────────────────

  describe('GET /auth/users', () => {
    it('devrait retourner la liste des utilisateurs pour un admin', async () => {
      // Given — admin authentifié, RolesGuard autorise
      await buildApp(ADMIN_USER)

      // When
      const res = await request(app.getHttpServer()).get('/auth/users')

      // Then — la liste est retournée, sans mot de passe
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      res.body.forEach((u: any) => {
        expect(u).not.toHaveProperty('password')
      })
    })

    it('devrait refuser l accès à un commercial (403)', async () => {
      // Given — commercial authentifié, RolesGuard refuse
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers:   [{ provide: AuthService, useValue: mockAuthService }],
      })
        .overrideGuard(JwtAuthGuard).useValue(makeJwtGuard(COMMERCIAL_USER))
        .overrideGuard(RolesGuard).useValue({
          canActivate: jest.fn().mockImplementation(() => {
            const { ForbiddenException } = require('@nestjs/common')
            throw new ForbiddenException('Accès refusé. Rôle requis : admin.')
          }),
        })
        .compile()

      const localApp = moduleRef.createNestApplication()
      await localApp.init()

      // When
      const res = await request(localApp.getHttpServer()).get('/auth/users')

      // Then — 403
      expect(res.status).toBe(403)

      await localApp.close()
    })
  })

  // ── POST /auth/invite ───────────────────────────────────────

  describe('POST /auth/invite', () => {
    it('devrait inviter un utilisateur avec un payload valide', async () => {
      // Given
      await buildApp(ADMIN_USER)
      const payload = {
        email:     'invite@test.com',
        full_name: 'Invité Test',
        role:      'commercial',
      }

      // When
      const res = await request(app.getHttpServer())
        .post('/auth/invite')
        .send(payload)

      // Then
      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toContain('Invitation')
    })

    it('devrait rejeter un payload avec un email invalide (400)', async () => {
      // Given
      await buildApp(ADMIN_USER)

      // When — email mal formé
      const res = await request(app.getHttpServer())
        .post('/auth/invite')
        .send({ email: 'pas-un-email', full_name: 'Test', role: 'commercial' })

      // Then — validation NestJS rejette
      expect(res.status).toBe(400)
    })

    it('devrait rejeter un rôle invalide autre que commercial ou utilisateur (400)', async () => {
      // Given
      await buildApp(ADMIN_USER)

      // When — rôle "admin" non autorisé à l invitation
      const res = await request(app.getHttpServer())
        .post('/auth/invite')
        .send({ email: 'test@test.com', full_name: 'Test', role: 'super_admin' })

      // Then
      expect(res.status).toBe(400)
    })
  })

  // ── PATCH /auth/users/:id/role ──────────────────────────────

  describe('PATCH /auth/users/:id/role', () => {
    it('devrait changer le rôle d un utilisateur cible', async () => {
      // Given
      await buildApp(ADMIN_USER)

      // When
      const targetId = '11111111-1111-1111-1111-111111111111'
      const res = await request(app.getHttpServer())
        .patch(`/auth/users/${targetId}/role`)
        .send({ role: 'utilisateur' })

      // Then
      expect(res.status).toBe(200)
      expect(mockAuthService.updateUserRole).toHaveBeenCalledWith(
        ADMIN_USER.id,
        targetId,
        'utilisateur'
      )
    })
  })

  // ── DELETE /auth/users/:id ──────────────────────────────────

  describe('DELETE /auth/users/:id', () => {
    it('devrait supprimer un utilisateur et retourner 200', async () => {
      // Given
      await buildApp(ADMIN_USER)

      // When
      const deleteId = '22222222-2222-2222-2222-222222222222'
      const res = await request(app.getHttpServer())
        .delete(`/auth/users/${deleteId}`)

      // Then
      expect(res.status).toBe(200)
      expect(mockAuthService.deleteUser).toHaveBeenCalledWith(
        ADMIN_USER.id,
        deleteId
      )
    })
  })
})
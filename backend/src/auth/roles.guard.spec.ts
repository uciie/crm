// ============================================================
// test/src/auth/roles.guard.spec.ts
// Tests unitaires — RolesGuard
// Convention : Given-When-Then
// ============================================================

import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector }                            from '@nestjs/core'
import { RolesGuard, ROLES_KEY }                from './roles.guard'
import type { AuthUser }                        from './types'

// ── Helpers ───────────────────────────────────────────────────

function buildContext(user: AuthUser | null, requiredRoles?: string[]): ExecutionContext {
  const reflector = new Reflector()

  const mockGetAllAndOverride = jest.fn().mockReturnValue(requiredRoles ?? [])

  const context = {
    getHandler:  jest.fn(),
    getClass:    jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  } as unknown as ExecutionContext

  return context
}

function makeGuard(requiredRoles?: string[]): {
  guard:   RolesGuard
  context: ExecutionContext
} {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles ?? []),
  } as unknown as Reflector

  const guard   = new RolesGuard(reflector)
  const context = buildContext(null, requiredRoles)
  return { guard, context }
}

// ─────────────────────────────────────────────────────────────

describe('RolesGuard', () => {

  // ── Accès sans restriction de rôle ─────────────────────────

  describe('quand aucun décorateur @Roles() n est présent', () => {
    it('devrait autoriser l accès à tout utilisateur authentifié', () => {
      // Given — pas de rôle requis, utilisateur commercial
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(undefined),
      } as unknown as Reflector
      const guard = new RolesGuard(reflector)

      const commercial: AuthUser = {
        id: 'uuid-c', email: 'c@test.com', role: 'commercial',
        full_name: 'Commercial Test', is_active: true,
      }
      const context = {
        getHandler:   jest.fn(),
        getClass:     jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: commercial }),
        }),
      } as unknown as ExecutionContext

      // When
      const result = guard.canActivate(context)

      // Then — accès accordé
      expect(result).toBe(true)
    })
  })

  // ── Rôle Admin ──────────────────────────────────────────────

  describe('quand la route requiert le rôle "admin"', () => {
    it('devrait autoriser un utilisateur admin', () => {
      // Given
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['admin']),
      } as unknown as Reflector
      const guard = new RolesGuard(reflector)

      const admin: AuthUser = {
        id: 'uuid-a', email: 'a@test.com', role: 'admin',
        full_name: 'Admin Test', is_active: true,
      }
      const context = {
        getHandler:   jest.fn(),
        getClass:     jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: admin }),
        }),
      } as unknown as ExecutionContext

      // When
      const result = guard.canActivate(context)

      // Then
      expect(result).toBe(true)
    })

    it('devrait interdire l accès à un utilisateur avec le rôle "commercial"', () => {
      // Given — route réservée admin, utilisateur commercial
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['admin']),
      } as unknown as Reflector
      const guard = new RolesGuard(reflector)

      const commercial: AuthUser = {
        id: 'uuid-c', email: 'c@test.com', role: 'commercial',
        full_name: 'Commercial Test', is_active: true,
      }
      const context = {
        getHandler:   jest.fn(),
        getClass:     jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: commercial }),
        }),
      } as unknown as ExecutionContext

      // When / Then — ForbiddenException levée
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })

    it('devrait interdire l accès à un utilisateur avec le rôle "utilisateur"', () => {
      // Given
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['admin']),
      } as unknown as Reflector
      const guard = new RolesGuard(reflector)

      const user: AuthUser = {
        id: 'uuid-u', email: 'u@test.com', role: 'utilisateur',
        full_name: 'Utilisateur Test', is_active: true,
      }
      const context = {
        getHandler:   jest.fn(),
        getClass:     jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user }),
        }),
      } as unknown as ExecutionContext

      // When / Then
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })
  })

  // ── Rôle Admin ou Commercial ────────────────────────────────

  describe('quand la route requiert "admin" ou "commercial"', () => {
    function makeGuardWithRoles(user: AuthUser) {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['admin', 'commercial']),
      } as unknown as Reflector
      const guard = new RolesGuard(reflector)
      const context = {
        getHandler:   jest.fn(),
        getClass:     jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user }),
        }),
      } as unknown as ExecutionContext
      return { guard, context }
    }

    it('devrait autoriser un commercial', () => {
      // Given
      const commercial: AuthUser = {
        id: 'uuid-c', email: 'c@test.com', role: 'commercial',
        full_name: 'Commercial', is_active: true,
      }
      const { guard, context } = makeGuardWithRoles(commercial)

      // When / Then
      expect(guard.canActivate(context)).toBe(true)
    })

    it('devrait autoriser un admin (hiérarchie des rôles)', () => {
      // Given — admin a toujours accès, même si le rôle n est pas dans la liste explicite
      const admin: AuthUser = {
        id: 'uuid-a', email: 'a@test.com', role: 'admin',
        full_name: 'Admin', is_active: true,
      }
      const { guard, context } = makeGuardWithRoles(admin)

      // When / Then
      expect(guard.canActivate(context)).toBe(true)
    })

    it('devrait interdire un utilisateur simple', () => {
      // Given
      const user: AuthUser = {
        id: 'uuid-u', email: 'u@test.com', role: 'utilisateur',
        full_name: 'Utilisateur', is_active: true,
      }
      const { guard, context } = makeGuardWithRoles(user)

      // When / Then
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })
  })

  // ── Message d erreur ForbiddenException ─────────────────────

  describe('message de l exception ForbiddenException', () => {
    it('devrait inclure le rôle requis et le rôle de l utilisateur dans le message', () => {
      // Given
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['admin']),
      } as unknown as Reflector
      const guard = new RolesGuard(reflector)

      const commercial: AuthUser = {
        id: 'uuid-c', email: 'c@test.com', role: 'commercial',
        full_name: 'Commercial', is_active: true,
      }
      const context = {
        getHandler:   jest.fn(),
        getClass:     jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: commercial }),
        }),
      } as unknown as ExecutionContext

      // When
      let thrownError: ForbiddenException | null = null
      try {
        guard.canActivate(context)
      } catch (e) {
        thrownError = e as ForbiddenException
      }

      // Then — le message mentionne les rôles concernés
      expect(thrownError).toBeInstanceOf(ForbiddenException)
      const message = thrownError!.message
      expect(message).toContain('admin')
      expect(message).toContain('commercial')
    })
  })

  // ── Utilisateur absent (null) ───────────────────────────────

  describe('quand req.user est null', () => {
    it('devrait lever ForbiddenException même si des rôles sont requis', () => {
      // Given — un utilisateur non authentifié a réussi à passer JwtAuthGuard (cas limite)
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['admin']),
      } as unknown as Reflector
      const guard = new RolesGuard(reflector)

      const context = {
        getHandler:   jest.fn(),
        getClass:     jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: null }),
        }),
      } as unknown as ExecutionContext

      // When / Then
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
    })
  })
})
// Vérifie le rôle de l'utilisateur après JwtAuthGuard
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthUser } from './types';

// Hiérarchie des rôles : admin > commercial > utilisateur
const ROLE_HIERARCHY: Record<string, number> = {
  admin:       3,
  commercial:  2,
  utilisateur: 1,
}

export const ROLES_KEY = 'roles'

/**
 * Décorateur @Roles() pour restreindre l'accès à certains rôles.
 *
 * Usage :
 *   @Roles('admin')                    → admin uniquement
 *   @Roles('admin', 'commercial')      → admin ou commercial
 *
 * Note : l'admin a toujours accès, quelle que soit la restriction.
 */
export const Roles = (...roles: Array<'admin' | 'commercial' | 'utilisateur'>) =>
  Reflect.metadata(ROLES_KEY, roles)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Récupère les rôles requis définis par @Roles() sur le handler ou la classe
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    // Aucun @Roles() défini → accessible à tous les utilisateurs authentifiés
    if (!requiredRoles || requiredRoles.length === 0) return true

    const { user }: { user: AuthUser } = context.switchToHttp().getRequest()

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié.')
    }

    // L'admin a toujours accès, quel que soit le rôle requis
    if (user.role === 'admin') return true

    // Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
    const hasRole = requiredRoles.some(
      (required) => user.role === required,
    )

    if (!hasRole) {
      throw new ForbiddenException(
        `Accès refusé. Rôle requis : ${requiredRoles.join(' ou ')}. Votre rôle : ${user.role}.`,
      )
    }

    return true
  }
}

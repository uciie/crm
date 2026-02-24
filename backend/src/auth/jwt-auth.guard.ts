// Protège les routes — retourne 401 si le JWT est absent ou invalide

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { AuthGuard }  from '@nestjs/passport'
import { Reflector }  from '@nestjs/core'
import { AuthUser } from './types';

// Décorateur pour marquer une route comme publique (pas besoin de JWT)
// Usage : @Public() sur un controller ou une méthode
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => Reflect.metadata(IS_PUBLIC_KEY, true)

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    // Vérifie si la route est marquée @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    // Délègue la vérification JWT à passport-jwt
    return super.canActivate(context)
  }

  /**
   * Gestion des erreurs d'authentification.
   * Surcharge pour personnaliser le message d'erreur.
   */
  handleRequest<TUser = AuthUser>(
    err: any,
    user: TUser,
    info: any,
  ): TUser {
    if (err || !user) {
      // info.message contient le détail de l'erreur Passport (ex: 'jwt expired')
      const message = info?.message === 'jwt expired'
        ? 'Session expirée. Veuillez vous reconnecter.'
        : info?.message === 'No auth token'
          ? 'Authentification requise.'
          : 'Token invalide ou expiré.'

      throw new UnauthorizedException(message)
    }
    return user
  }
}

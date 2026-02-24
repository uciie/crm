// Valide le JWT Supabase, charge le profil depuis Neon/Drizzle

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy }                  from '@nestjs/passport'
import { ExtractJwt, Strategy }              from 'passport-jwt'
import { ConfigService }                     from '@nestjs/config'
import { eq }                                from 'drizzle-orm'

import { db }       from '../database/db.config'
import { profiles } from '../database/schema'

// Type injecté dans req.user après validation
export interface AuthUser {
  id:        string
  email:     string
  role:      'admin' | 'commercial' | 'utilisateur'
  full_name: string
  is_active: boolean
}

// Structure du payload JWT Supabase
interface SupabaseJwtPayload {
  sub:   string          // UUID de l'utilisateur
  email: string
  role:  string          // rôle Supabase (authenticated, service_role, etc.)
  exp:   number
  iat:   number
  aud:   string
  // Champs custom éventuels (via Supabase Auth metadata)
  user_metadata?: {
    full_name?: string
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('SUPABASE_JWT_PUBLIC_KEY'),
      algorithms:       ['ES256'], 
    })
  }

  /**
   * Appelé automatiquement par Passport après validation de la signature JWT.
   * La valeur retournée est injectée dans req.user.
   */
  async validate(payload: SupabaseJwtPayload): Promise<AuthUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Token invalide : subject manquant')
    }

    // Charge le profil depuis Neon pour obtenir le rôle CRM et is_active
    const [profile] = await db
      .select({
        id:        profiles.id,
        full_name: profiles.full_name,
        role:      profiles.role,
        is_active: profiles.is_active,
      })
      .from(profiles)
      .where(eq(profiles.id, payload.sub))
      .limit(1)

    if (!profile) {
      throw new UnauthorizedException(
        'Profil introuvable. Le compte a peut-être été supprimé.'
      )
    }

    if (!profile.is_active) {
      throw new UnauthorizedException(
        'Compte désactivé. Contactez votre administrateur.'
      )
    }

    return {
      id:        profile.id,
      email:     payload.email,
      role:      profile.role as AuthUser['role'],
      full_name: profile.full_name,
      is_active: profile.is_active ?? true,
    }
  }
}
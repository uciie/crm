// Logique métier : profil, changement de rôle, désactivation

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'
import { eq }           from 'drizzle-orm'

import { db }       from '../database/db.config'
import { profiles } from '../database/schema'

export class UpdateProfileDto {
  full_name?:  string
  phone?:      string
  avatar_url?: string
}

export class UpdateUserRoleDto {
  role:      'admin' | 'commercial' | 'utilisateur'
  userId:    string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  // Client Supabase Admin (service_role) — uniquement côté serveur
  private supabaseAdmin;

  /**
   * FRONTEND_URL est lu depuis les variables d'environnement NestJS.
   * Ne jamais utiliser window.location.origin ici — ce code s'exécute
   * côté Node.js (pas dans un navigateur), window n'existe pas.
   *
   * Ajoutez dans votre .env :
   *   FRONTEND_URL=https://votre-domaine.com
   */
  private readonly frontendUrl: string

  constructor(private readonly config: ConfigService) {
    this.supabaseAdmin = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY')
    )

    // Fix #3 — était window.location.origin (crash Node.js)
    this.frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL')
  }

  // ── Récupère le profil complet d'un utilisateur ──────────

  async getProfile(userId: string) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)

    if (!profile) throw new NotFoundException('Profil introuvable')

    return profile
  }

  // ── Met à jour le profil (nom, téléphone, avatar) ────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const [updated] = await db
      .update(profiles)
      .set({ ...dto, updated_at: new Date() })
      .where(eq(profiles.id, userId))
      .returning()

    if (!updated) throw new NotFoundException('Profil introuvable')

    return updated
  }

  // ── Liste tous les utilisateurs (admin uniquement) ───────

  async findAllUsers() {
    return db
      .select({
        id:         profiles.id,
        full_name:  profiles.full_name,
        role:       profiles.role,
        phone:      profiles.phone,
        avatar_url: profiles.avatar_url,
        is_active:  profiles.is_active,
        created_at: profiles.created_at,
      })
      .from(profiles)
      .orderBy(profiles.created_at)
  }

  // ── Change le rôle d'un utilisateur (admin uniquement) ───

  async updateUserRole(
    requesterId: string,
    targetUserId: string,
    newRole: 'admin' | 'commercial' | 'utilisateur',
  ) {
    // Empêche un admin de se rétrograder lui-même
    if (requesterId === targetUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier votre propre rôle.'
      )
    }

    const [updated] = await db
      .update(profiles)
      .set({ role: newRole, updated_at: new Date() })
      .where(eq(profiles.id, targetUserId))
      .returning()

    if (!updated) throw new NotFoundException('Utilisateur introuvable')

    this.logger.log(
      `Rôle mis à jour : utilisateur ${targetUserId} → ${newRole} (par ${requesterId})`
    )

    return updated
  }

  // ── Active / désactive un utilisateur (admin uniquement) ─

  async toggleUserActive(
    requesterId: string,
    targetUserId: string,
    isActive: boolean,
  ) {
    if (requesterId === targetUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas désactiver votre propre compte.'
      )
    }

    const [updated] = await db
      .update(profiles)
      .set({ is_active: isActive, updated_at: new Date() })
      .where(eq(profiles.id, targetUserId))
      .returning()

    if (!updated) throw new NotFoundException('Utilisateur introuvable')

    return {
      message: isActive
        ? `Utilisateur ${updated.full_name} activé.`
        : `Utilisateur ${updated.full_name} désactivé.`,
      user: updated,
    }
  }

  // ── Invite un nouvel utilisateur via Supabase Admin API ──

  async inviteUser(email: string, fullName: string, role: 'commercial' | 'utilisateur') {
    const { data, error } = await this.supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: fullName },
        // Fix #3 — this.frontendUrl remplace window.location.origin (inexistant en Node.js)
        redirectTo: `${this.frontendUrl}/auth/update-password`,
      }
    )

    if (error) {
      // Log technique détaillé UNIQUEMENT en développement
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(`Erreur invitation Supabase : ${error.message}`)
      } else {
        this.logger.error(`Échec invitation — code: ${error.status ?? 'inconnu'}`)
      }

      if (error.message.includes('already registered')) {
        throw new ConflictException('Cet email est déjà enregistré.')
      }
      throw new ConflictException(`Erreur lors de l'invitation.`)
    }

    // Crée le profil en base avec le rôle défini
    // (le trigger SQL le crée aussi, mais on force le rôle ici)
    if (data.user) {
      await db
        .insert(profiles)
        .values({
          id:        data.user.id,
          full_name: fullName,
          role:      role,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set:    { role, full_name: fullName, updated_at: new Date() },
        })
    }

    this.logger.log(`Invitation envoyée à ${email} avec le rôle ${role}`)

    return {
      message: `Invitation envoyée à ${email}`,
      userId:  data.user?.id,
    }
  }

  // ── Supprime un utilisateur (admin uniquement) ───────────

  async deleteUser(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer votre propre compte.'
      )
    }

    // Suppression dans Supabase Auth (cascade sur profiles grâce à ON DELETE CASCADE)
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (error) {
      throw new ConflictException(`Erreur suppression : ${error.message}`)
    }

    this.logger.log(`Utilisateur ${targetUserId} supprimé par ${requesterId}`)

    return { message: 'Utilisateur supprimé avec succès.' }
  }
}
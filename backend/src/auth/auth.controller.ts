// Endpoints REST du module Auth

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { IsEmail, IsString, IsEnum, MaxLength, IsBoolean } from 'class-validator'
import { AuthService, UpdateProfileDto, UpdateUserRoleDto } from './auth.service'
import { JwtAuthGuard, Public }   from './jwt-auth.guard'
import { RolesGuard, Roles }      from './roles.guard'
import { AuthUser }               from './jwt.strategy'

// DTO pour l'invitation
class InviteUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MaxLength(255)
  full_name: string

  @IsEnum(['commercial', 'utilisateur'])
  role: 'commercial' | 'utilisateur'
}

// DTO pour le changement de statut actif
class ToggleActiveDto {
  @IsBoolean()
  is_active: boolean
}

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── GET /auth/me ─────────────────────────────────────────
  // Retourne le profil de l'utilisateur connecté
  @Get('me')
  getMe(@Request() req: { user: AuthUser }) {
    return this.authService.getProfile(req.user.id)
  }

  // ── PATCH /auth/me ───────────────────────────────────────
  // Met à jour son propre profil (nom, téléphone, avatar)
  @Patch('me')
  updateMe(
    @Request() req: { user: AuthUser },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, dto)
  }

  // ── GET /auth/users ──────────────────────────────────────
  // Liste tous les utilisateurs (admin uniquement)
  @Get('users')
  @Roles('admin')
  findAllUsers() {
    return this.authService.findAllUsers()
  }

  // ── POST /auth/invite ────────────────────────────────────
  // Invite un nouvel utilisateur par email (admin uniquement)
  // Supabase envoie un email d'invitation automatiquement
  @Post('invite')
  @Roles('admin')
  inviteUser(
    @Body() dto: InviteUserDto,
  ) {
    return this.authService.inviteUser(dto.email, dto.full_name, dto.role)
  }

  // ── PATCH /auth/users/:id/role ───────────────────────────
  // Change le rôle d'un utilisateur (admin uniquement)
  @Patch('users/:id/role')
  @Roles('admin')
  updateRole(
    @Request() req: { user: AuthUser },
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body('role') role: 'admin' | 'commercial' | 'utilisateur',
  ) {
    return this.authService.updateUserRole(req.user.id, targetId, role)
  }

  // ── PATCH /auth/users/:id/active ─────────────────────────
  // Active ou désactive un utilisateur (admin uniquement)
  @Patch('users/:id/active')
  @Roles('admin')
  toggleActive(
    @Request() req: { user: AuthUser },
    @Param('id', ParseUUIDPipe) targetId: string,
    @Body() dto: ToggleActiveDto,
  ) {
    return this.authService.toggleUserActive(req.user.id, targetId, dto.is_active)
  }

  // ── DELETE /auth/users/:id ───────────────────────────────
  // Supprime un utilisateur (admin uniquement)
  @Delete('users/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  deleteUser(
    @Request() req: { user: AuthUser },
    @Param('id', ParseUUIDPipe) targetId: string,
  ) {
    return this.authService.deleteUser(req.user.id, targetId)
  }
}

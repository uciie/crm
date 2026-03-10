// ============================================================
// email/email.controller.ts
// REST endpoints pour les campagnes email
// ============================================================

import {
  Controller, Get, Post, Patch,
  Body, Param, Request,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard }          from '../auth/jwt-auth.guard'
import { RolesGuard, Roles }     from '../auth/roles.guard'
import { EmailService }          from './email.service'
import { db }                    from '../database/db.config'
import { emailCampaigns }        from '../database/schema'
import { desc }                  from 'drizzle-orm'
import { mapBrevoStatus }        from './email.service'

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * GET /email/campaigns
   * Retourne toutes les campagnes, statut mappé FR à la volée.
   */
  @Get('campaigns')
  async listCampaigns() {
    const rows = await db
      .select()
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.created_at))

    // Normalise les statuts anglais (hérités de Brevo) vers le format CRM FR
    return rows.map(c => ({
      ...c,
      status: mapBrevoStatus(c.status ?? '', c.status ?? 'brouillon'),
    }))
  }

  /**
   * POST /email/campaigns
   * Crée une nouvelle campagne Brevo et la stocke localement.
   */
  @Post('campaigns')
  @Roles('admin', 'commercial')
  async createCampaign(
    @Body() body: {
      name:         string
      subject:      string
      htmlContent:  string
      listIds:      number[]
      scheduledAt?: string
    },
    @Request() req: any,
  ) {
    return this.emailService.createCampaign({
      name:        body.name,
      subject:     body.subject,
      htmlContent: body.htmlContent,
      listIds:     body.listIds,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      createdBy:   req.user.id,
    })
  }

  /**
   * PATCH /email/campaigns/:id/sync
   * Tire les stats live depuis Brevo pour une campagne.
   */
  @Patch('campaigns/:id/sync')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async syncCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailService.syncCampaignStats(id)
  }

  /**
   * GET /email/campaigns/fix-statuses
   * Migration one-shot : corrige tous les statuts EN → FR en DB.
   * Admin uniquement. Peut être retiré une fois exécuté.
   */
  @Get('campaigns/fix-statuses')
  @Roles('admin')
  async fixStatuses() {
    return this.emailService.fixLegacyStatuses()
  }
}
// ============================================================
// email/email.controller.ts
// REST endpoints for email campaigns
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

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * GET /email/campaigns
   * Returns all campaigns ordered newest-first.
   */
  @Get('campaigns')
  async listCampaigns() {
    const rows = await db
      .select()
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.created_at))

    return rows
  }

  /**
   * POST /email/campaigns
   * Creates a new Brevo campaign and stores it locally.
   * Body: { name, subject, htmlContent, listIds, scheduledAt? }
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
   * Pulls live stats from Brevo for a single campaign.
   */
  @Patch('campaigns/:id/sync')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async syncCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailService.syncCampaignStats(id)
  }
}
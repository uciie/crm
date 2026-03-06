// ============================================================
// communications/communications.controller.ts
// ============================================================

import {
  Controller, Get, Post, Delete,
  Body, Query, Param, Request,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard }             from '../auth/jwt-auth.guard'
import { RolesGuard, Roles }        from '../auth/roles.guard'
import { CommunicationsService }    from './communications.service'
import { CreateCommunicationDto }   from './dto/create-communication.dto'

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  /**
   * GET /communications/timeline
   * Query params: contact_id?, lead_id?, limit?
   * Powers the contact detail page timeline.
   */
  @Get('timeline')
  getTimeline(
    @Query('contact_id') contactId?: string,
    @Query('lead_id')    leadId?:    string,
    @Query('limit')      limit?:     number,
  ) {
    return this.communicationsService.getTimeline({ contact_id: contactId, lead_id: leadId, limit })
  }

  /**
   * GET /communications/stats
   */
  @Get('stats')
  getStats(@Request() req: any) {
    return this.communicationsService.getStats(req.user.id, req.user.role)
  }

  /**
   * GET /communications/sync-campaigns
   * Admin only — pulls latest stats from Brevo for all campaigns.
   */
  @Get('sync-campaigns')
  @Roles('admin')
  syncCampaigns() {
    return this.communicationsService.syncCampaignStats()
  }

  /**
   * POST /communications
   * Manually log a call, meeting, note, SMS or outbound email.
   */
  @Post()
  create(@Body() dto: CreateCommunicationDto, @Request() req: any) {
    return this.communicationsService.create(dto, req.user.id)
  }

  /**
   * DELETE /communications/:id
   * Users can only delete their own entries; admins can delete all.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.communicationsService.remove(id, req.user.id)
  }
}
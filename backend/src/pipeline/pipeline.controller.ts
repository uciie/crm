// ============================================================
// pipeline/pipeline.controller.ts — passes req.user.id to moveDeal
// ============================================================

import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common'
import { JwtAuthGuard }     from '../auth/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/roles.guard'
import { PipelineService }  from './pipeline.service'

@Controller('pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('kanban')
  getKanban(@Request() req: any) {
    return this.pipelineService.getKanbanBoard(req.user.id, req.user.role)
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.pipelineService.getPipelineStats(req.user.id, req.user.role)
  }

  /**
   * PATCH /pipeline/deals/:dealId/move
   * Now forwards req.user.id so the service can send the email notification.
   */
  @Patch('deals/:dealId/move')
  @Roles('admin', 'commercial')
  moveDeal(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body('stage_id') stageId: string,
    @Request() req: any,
  ) {
    return this.pipelineService.moveDeal(dealId, stageId, req.user.id)  // ← NEW 3rd arg
  }

  @Post('deals')
  @Roles('admin', 'commercial')
  createDeal(@Body() body: { lead_id: string; stage_id?: string }) {
    return this.pipelineService.createDeal(body.lead_id, body.stage_id)
  }
}
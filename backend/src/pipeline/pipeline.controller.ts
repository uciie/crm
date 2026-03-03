import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/roles.guard'
import { PipelineService } from './pipeline.service'

@Controller('pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  // GET /pipeline/kanban
  @Get('kanban')
  getKanban(@Request() req: any) {
    return this.pipelineService.getKanbanBoard(req.user.id, req.user.role)
  }

  // GET /pipeline/stats
  @Get('stats')
  getStats(@Request() req: any) {
    return this.pipelineService.getPipelineStats(req.user.id, req.user.role)
  }

  // PATCH /pipeline/deals/:dealId/move
  @Patch('deals/:dealId/move')
  @Roles('admin', 'commercial')
  moveDeal(
    @Param('dealId', ParseUUIDPipe) dealId: string,
    @Body('stage_id') stageId: string
  ) {
    return this.pipelineService.moveDeal(dealId, stageId)
  }

  // POST /pipeline/deals
  @Post('deals')
  @Roles('admin', 'commercial')
  createDeal(@Body() body: { lead_id: string; stage_id?: string }) {
    return this.pipelineService.createDeal(body.lead_id, body.stage_id)
  }
}

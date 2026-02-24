import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /dashboard/kpis
  @Get('kpis')
  getKpis(@Request() req: any) {
    return this.dashboardService.getKpis(req.user.id, req.user.role)
  }

  // GET /dashboard/leads-by-status
  @Get('leads-by-status')
  getLeadsByStatus(@Request() req: any) {
    return this.dashboardService.getLeadsByStatus(req.user.id, req.user.role)
  }

  // GET /dashboard/activity
  @Get('activity')
  getActivity(@Request() req: any, @Query('limit') limit?: number) {
    return this.dashboardService.getActivityFeed(req.user.id, req.user.role, limit)
  }

  // GET /dashboard/top-commercials
  @Get('top-commercials')
  getTopCommercials() {
    return this.dashboardService.getTopCommercials()
  }
}
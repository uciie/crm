import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common'
import { JwtAuthGuard }    from '../auth/jwt-auth.guard'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/kpis
   *
   * Retourne tous les KPIs de la page d'accueil.
   *
   * FIX §1.1 — Paramètres de période optionnels
   * @query startDate  ISO date (ex: "2025-01-01") — défaut : 1er jour du mois courant
   * @query endDate    ISO date (ex: "2025-03-31") — défaut : maintenant
   *
   * Exemple : GET /dashboard/kpis?startDate=2025-01-01&endDate=2025-03-31
   */
  @Get('kpis')
  getKpis(
    @Request()          req:        any,
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?:   string,
  ) {
    return this.dashboardService.getKpis(
      req.user.id,
      req.user.role,
      startDate,
      endDate,
    )
  }

  /**
   * GET /dashboard/leads-by-status
   *
   * FIX §1.1 — Filtre de période ajouté
   * Exemple : GET /dashboard/leads-by-status?startDate=2025-01-01&endDate=2025-06-30
   */
  @Get('leads-by-status')
  getLeadsByStatus(
    @Request()          req:        any,
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?:   string,
  ) {
    return this.dashboardService.getLeadsByStatus(
      req.user.id,
      req.user.role,
      startDate,
      endDate,
    )
  }

  /**
   * GET /dashboard/leads-by-source   FIX §3.2 — nouvel endpoint
   *
   * Agrégation des leads par canal d'acquisition (champ source).
   * Retourne : source, total_leads, won_leads, revenue, win_rate.
   *
   * Exemple : GET /dashboard/leads-by-source?startDate=2025-01-01
   */
  @Get('leads-by-source')
  getLeadsBySource(
    @Request()          req:        any,
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?:   string,
  ) {
    return this.dashboardService.getLeadsBySource(
      req.user.id,
      req.user.role,
      startDate,
      endDate,
    )
  }

  /**
   * GET /dashboard/contacts-by-segment   FIX §2.2 — nouvel endpoint
   *
   * Segmentation des contacts par secteur d'activité ou par ville.
   * @query dimension  'industry' | 'city'  (défaut : 'industry')
   *
   * Exemple : GET /dashboard/contacts-by-segment?dimension=city
   */
  @Get('contacts-by-segment')
  getContactsBySegment(
    @Request()            req:       any,
    @Query('dimension')   dimension?: 'industry' | 'city',
  ) {
    return this.dashboardService.getContactsBySegment(
      req.user.id,
      req.user.role,
      dimension ?? 'industry',
    )
  }

  /**
   * GET /dashboard/ltv   FIX §2.3 — nouvel endpoint
   *
   * Lifetime Value par contact (somme des opportunités gagnées).
   * @query limit  Nombre de contacts retournés (défaut : 20)
   *
   * Exemple : GET /dashboard/ltv?limit=10
   */
  @Get('ltv')
  getLtv(
    @Request() req: any,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getLtv(req.user.id, req.user.role, limit)
  }

  /**
   * GET /dashboard/activity
   * Fil d'activité récente (communications + changements de leads).
   */
  @Get('activity')
  getActivity(
    @Request()        req:     any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getActivityFeed(req.user.id, req.user.role, limit)
  }

  /**
   * GET /dashboard/top-commercials
   *
   * FIX §1.1 — Période paramétrable (auparavant hardcodée sur le mois courant)
   * Exemple : GET /dashboard/top-commercials?startDate=2025-01-01&endDate=2025-03-31
   */
  @Get('top-commercials')
  getTopCommercials(
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?:   string,
  ) {
    return this.dashboardService.getTopCommercials(startDate, endDate)
  }
}
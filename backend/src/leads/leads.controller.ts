import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard }     from '../auth/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/roles.guard'
import { LeadsService }     from './leads.service'
import type { LeadFilters } from './leads.service'
import { CreateLeadDto }    from './dto/create-lead.dto'

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // GET /leads?search=&status=&contact_id=&page=1
  @Get()
  findAll(@Request() req: any, @Query() filters: LeadFilters) {
    return this.leadsService.findAll(req.user, filters)
  }

  // GET /leads/stats
  @Get('stats')
  getStats(@Request() req: any) {
    return this.leadsService.getStats(req.user.id, req.user.role)
  }

  // GET /leads/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.leadsService.findOne(id, req.user)
  }

  // POST /leads
  @Post()
  @Roles('admin', 'commercial')
  create(@Body() dto: CreateLeadDto, @Request() req: any) {
    return this.leadsService.create(dto, req.user.id)
  }

  // PATCH /leads/:id
  @Patch(':id')
  @Roles('admin', 'commercial')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateLeadDto>,
    @Request() req: any
  ) {
    return this.leadsService.update(id, dto, req.user)
  }

  // DELETE /leads/:id
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.leadsService.remove(id, req.user)
  }
}
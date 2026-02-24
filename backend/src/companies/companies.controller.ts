import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard }     from '../auth/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/roles.guard'
import { CompaniesService } from './companies.service'
import type { CompanyFilters } from './companies.service'
import { CreateCompanyDto } from './dto/create-company.dto'

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  // GET /companies?search=&industry=&city=&page=1&limit=20
  @Get()
  findAll(@Query() filters: CompanyFilters) {
    return this.companiesService.findAll(filters)
  }

  // GET /companies/stats
  @Get('stats')
  getStats() {
    return this.companiesService.getStats()
  }

  // GET /companies/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findOne(id)
  }

  // POST /companies
  @Post()
  @Roles('admin', 'commercial')
  create(@Body() dto: CreateCompanyDto, @Request() req: any) {
    return this.companiesService.create(dto, req.user.id)
  }

  // PATCH /companies/:id
  @Patch(':id')
  @Roles('admin', 'commercial')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCompanyDto>,
  ) {
    return this.companiesService.update(id, dto)
  }

  // DELETE /companies/:id
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.remove(id)
  }
}
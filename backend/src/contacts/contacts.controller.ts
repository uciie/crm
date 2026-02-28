import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard }      from '../auth/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/roles.guard'
import { ContactsService }   from './contacts.service'
import { CreateContactDto }  from './dto/create-contact.dto'
import { ContactFiltersDto } from './dto/contact-filters.dto'  // ← nouveau DTO validé

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // GET /contacts?search=&company_id=&page=1&limit=20
  // Les query params sont désormais validés et transformés par ContactFiltersDto
  @Get()
  findAll(
    @Request() req: any,
    @Query() filters: ContactFiltersDto,
  ) {
    // Ajout temporaire pour confirmer la valeur reçue
    console.log('🔍 Controller filters:', filters)
    console.log('🔍 is_subscribed value:', filters.is_subscribed, '| type:', typeof filters.is_subscribed)
    return this.contactsService.findAll(req.user, filters)
  }

  // GET /contacts/stats
  @Get('stats')
  getStats(@Request() req: any) {
    return this.contactsService.getStats(req.user.id, req.user.role)
  }

  // GET /contacts/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.contactsService.findOne(id, req.user)
  }

  // POST /contacts
  @Post()
  @Roles('admin', 'commercial')
  create(@Body() dto: CreateContactDto, @Request() req: any) {
    return this.contactsService.create(dto, req.user.id)
  }

  // PATCH /contacts/:id
  @Patch(':id')
  @Roles('admin', 'commercial')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateContactDto>,
    @Request() req: any
  ) {
    return this.contactsService.update(id, dto, req.user)
  }

  // DELETE /contacts/:id
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.remove(id)
  }
}
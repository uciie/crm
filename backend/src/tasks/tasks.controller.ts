import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard }  from '../auth/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/roles.guard'
import { TasksService } from './tasks.service'
import type { TaskFilters } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // GET /tasks?status=à_faire&priority=haute&overdue=true&page=1
  // FIX #3 — Les paramètres date_from et date_to sont maintenant supportés :
  // GET /tasks?date_from=2025-01-01&date_to=2025-01-07  → vue semaine agenda
  // GET /tasks?type=rendez-vous&date_from=...           → RDV de la semaine
  @Get()
  findAll(@Request() req: any, @Query() filters: TaskFilters) {
    return this.tasksService.findAll(req.user, filters)
  }

  // GET /tasks/stats
  @Get('stats')
  getStats(@Request() req: any) {
    return this.tasksService.getStats(req.user.id, req.user.role)
  }

  // GET /tasks/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.tasksService.findOne(id, req.user)
  }

  // POST /tasks
  @Post()
  create(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(dto, req.user.id)
  }

  // PATCH /tasks/:id
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: any
  ) {
    return this.tasksService.update(id, dto, req.user)
  }

  // DELETE /tasks/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.tasksService.remove(id, req.user)
  }
}
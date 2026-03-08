// ============================================================
// tasks/tasks.service.ts — with email trigger on create/assign
// Diff vs original: EmailService injected, sendTaskAssigned()
// called when the task is assigned to someone other than creator.
// ============================================================

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { db } from '../database/db.config'
import { tasks, contacts, leads, companies, profiles } from '../database/schema'
import { eq, and, or, lt, gte, lte, desc, sql, isNull } from 'drizzle-orm'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { EmailService }  from '../email/email.service'   // ← NEW
import { AuthUser }      from '../auth/types'

export interface TaskFilters {
  status?:      string
  priority?:    string
  type?:        string
  assigned_to?: string
  contact_id?:  string
  lead_id?:     string
  overdue?:     boolean
  date_from?:   string
  date_to?:     string
  page?:        number
  limit?:       number
}

@Injectable()
export class TasksService {

  constructor(private readonly emailService: EmailService) {} // ← NEW

  async findAll(user: AuthUser, filters: TaskFilters = {}) {
    const {
      status, priority, type, assigned_to,
      contact_id, lead_id, overdue,
      date_from, date_to,
      page = 1, limit = 20
    } = filters
    const offset = (page - 1) * limit

    const conditions: any[] = []

    if (user.role !== 'admin') {
      conditions.push(eq(tasks.assigned_to, user.id))
    } else if (assigned_to) {
      conditions.push(eq(tasks.assigned_to, assigned_to))
    }

    if (status)     conditions.push(eq(tasks.status, status as any))
    if (priority)   conditions.push(eq(tasks.priority, priority as any))
    if (type)       conditions.push(eq(tasks.type, type as any))
    if (contact_id) conditions.push(eq(tasks.contact_id, contact_id))
    if (lead_id)    conditions.push(eq(tasks.lead_id, lead_id))

    if (overdue) {
      conditions.push(
        and(lt(tasks.due_date, new Date()), sql`${tasks.status} NOT IN ('terminée', 'annulée')`)
      )
    }
    if (date_from) conditions.push(gte(tasks.due_date, new Date(date_from)))
    if (date_to)   conditions.push(lte(tasks.due_date, new Date(date_to)))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id:           tasks.id,
        title:        tasks.title,
        description:  tasks.description,
        status:       tasks.status,
        priority:     tasks.priority,
        type:         tasks.type,
        due_date:     tasks.due_date,
        completed_at: tasks.completed_at,
        created_at:   tasks.created_at,
        contact_id:   tasks.contact_id,
        lead_id:      tasks.lead_id,
        company_id:   tasks.company_id,
        assigned_to:  tasks.assigned_to,
        contact: {
          id:         contacts.id,
          first_name: contacts.first_name,
          last_name:  contacts.last_name,
          email:      contacts.email,
        },
        lead: {
          id:    leads.id,
          title: leads.title,
          value: leads.value,
        },
        assignee: {
          id:         profiles.id,
          full_name:  profiles.full_name,
          avatar_url: profiles.avatar_url,
        },
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contact_id, contacts.id))
      .leftJoin(leads,    eq(tasks.lead_id,    leads.id))
      .leftJoin(profiles, eq(tasks.assigned_to, profiles.id))
      .where(whereClause)
      .orderBy(
        sql`CASE ${tasks.priority}
          WHEN 'urgente' THEN 1 WHEN 'haute' THEN 2
          WHEN 'moyenne' THEN 3 WHEN 'basse' THEN 4
        END`,
        tasks.due_date
      )
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(whereClause)

    return {
      data: rows,
      pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) },
    }
  }

  async findOne(id: string, user: AuthUser) {
    const [task] = await db
      .select({
        id:           tasks.id,
        title:        tasks.title,
        description:  tasks.description,
        status:       tasks.status,
        priority:     tasks.priority,
        type:         tasks.type,
        due_date:     tasks.due_date,
        completed_at: tasks.completed_at,
        created_at:   tasks.created_at,
        contact_id:   tasks.contact_id,
        lead_id:      tasks.lead_id,
        company_id:   tasks.company_id,
        assigned_to:  tasks.assigned_to,
        contact: {
          id:         contacts.id,
          first_name: contacts.first_name,
          last_name:  contacts.last_name,
          email:      contacts.email,
        },
        lead: {
          id:    leads.id,
          title: leads.title,
          value: leads.value,
        },
        assignee: {
          id:         profiles.id,
          full_name:  profiles.full_name,
          avatar_url: profiles.avatar_url,
        },
      })
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contact_id, contacts.id))
      .leftJoin(leads,    eq(tasks.lead_id,    leads.id))
      .leftJoin(profiles, eq(tasks.assigned_to, profiles.id))
      .where(eq(tasks.id, id))
      .limit(1)

    if (!task) throw new NotFoundException('Tâche introuvable')

    if (user.role !== 'admin' && task.assigned_to !== user.id) {
      throw new ForbiddenException('Accès refusé')
    }

    return task
  }

  async create(dto: CreateTaskDto, userId: string) {
    const assigneeId = dto.assigned_to ?? userId

    const [newTask] = await db
      .insert(tasks)
      .values({
        title:       dto.title,
        description: dto.description,
        status:      dto.status   ?? 'à_faire',
        priority:    dto.priority ?? 'moyenne',
        type:        dto.type     ?? 'tache',
        due_date:    dto.due_date ? new Date(dto.due_date) : undefined,
        contact_id:  dto.contact_id,
        lead_id:     dto.lead_id,
        company_id:  dto.company_id,
        assigned_to: assigneeId,
        created_by:  userId,
      })
      .returning()

    // ── Email trigger — notify assignee if different from creator ──
    if (assigneeId !== userId) {
      // Resolve contact name for the email body (best-effort)
      let contactName: string | undefined
      if (dto.contact_id) {
        const [contact] = await db
          .select({ first_name: contacts.first_name, last_name: contacts.last_name })
          .from(contacts)
          .where(eq(contacts.id, dto.contact_id))
          .limit(1)
        if (contact) contactName = `${contact.first_name} ${contact.last_name}`
      }

      this.emailService
        .sendTaskAssigned({
          assigneeId:  assigneeId,
          taskId:      newTask.id,
          taskTitle:   newTask.title,
          priority:    newTask.priority,
          dueDate:     newTask.due_date?.toISOString(),
          contactName,
          createdById: userId,
        })
        .catch(err => console.error('[TasksService] sendTaskAssigned failed:', err?.message))
    }

    return newTask
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthUser) {
    await this.findOne(id, user)

    const updatePayload: any = { ...dto, updated_at: new Date() }

    if (dto.status === 'terminée' && !dto.completed_at) {
      updatePayload.completed_at = new Date()
    }
    if (dto.status && dto.status !== 'terminée') {
      updatePayload.completed_at = null
    }
    if (dto.due_date) updatePayload.due_date = new Date(dto.due_date)

    const [updated] = await db
      .update(tasks)
      .set(updatePayload)
      .where(eq(tasks.id, id))
      .returning()

    return updated
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user)

    const [deleted] = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id })

    return { message: 'Tâche supprimée', id: deleted.id }
  }

  async getStats(userId: string, role: string) {
    const isAdmin = role === 'admin'

    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'à_faire')                     AS todo,
        COUNT(*) FILTER (WHERE status = 'en_cours')                    AS in_progress,
        COUNT(*) FILTER (WHERE status = 'terminée')                    AS done,
        COUNT(*) FILTER (
          WHERE status NOT IN ('terminée','annulée') AND due_date < NOW()
        )                                                               AS overdue,
        COUNT(*) FILTER (
          WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
            AND status NOT IN ('terminée','annulée')
        )                                                               AS due_soon
      FROM tasks
      ${!isAdmin ? sql`WHERE assigned_to = ${userId}` : sql``}
    `)

    const stats = result.rows[0] as any
    return {
      todo:        Number(stats.todo),
      in_progress: Number(stats.in_progress),
      done:        Number(stats.done),
      overdue:     Number(stats.overdue),
      due_soon:    Number(stats.due_soon),
    }
  }
}
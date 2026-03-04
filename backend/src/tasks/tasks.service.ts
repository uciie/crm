import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { db } from '../database/db.config'
import { tasks, contacts, leads, companies, profiles } from '../database/schema'
import { eq, and, or, lt, gte, lte, desc, sql, isNull } from 'drizzle-orm'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { AuthUser } from '../auth/types'

export interface TaskFilters {
  status?:      string
  priority?:    string
  // FIX #1 — Ajout du filtre par type de tâche (rappel, rendez-vous, appel, tâche)
  type?:        string
  assigned_to?: string
  contact_id?:  string
  lead_id?:     string
  overdue?:     boolean
  // FIX #3 — Ajout des filtres de plage de dates pour l'affichage calendaire.
  // Indispensable pour récupérer "les tâches de la semaine" dans un agenda.
  date_from?:   string          // ISO string — borne inférieure de due_date
  date_to?:     string          // ISO string — borne supérieure de due_date
  page?:        number
  limit?:       number
}

@Injectable()
export class TasksService {

  async findAll(user: AuthUser, filters: TaskFilters = {}) {
    const {
      status, priority, type, assigned_to,
      contact_id, lead_id, overdue,
      // FIX #3 — Extraction des nouvelles bornes de dates
      date_from, date_to,
      page = 1, limit = 20
    } = filters
    const offset = (page - 1) * limit

    const conditions: any[] = []

    // Les commerciaux ne voient que leurs tâches
    if (user.role !== 'admin') {
      conditions.push(eq(tasks.assigned_to, user.id))
    } else if (assigned_to) {
      conditions.push(eq(tasks.assigned_to, assigned_to))
    }

    if (status)     conditions.push(eq(tasks.status, status as any))
    if (priority)   conditions.push(eq(tasks.priority, priority as any))
    // FIX #1 — Filtrage par type de tâche
    if (type)       conditions.push(eq(tasks.type, type as any))
    if (contact_id) conditions.push(eq(tasks.contact_id, contact_id))
    if (lead_id)    conditions.push(eq(tasks.lead_id, lead_id))

    // Filtre tâches en retard (due_date < now et pas terminée/annulée)
    if (overdue) {
      conditions.push(
        and(
          lt(tasks.due_date, new Date()),
          sql`${tasks.status} NOT IN ('terminée', 'annulée')`
        )
      )
    }

    // FIX #3 — Filtres de plage de dates pour l'affichage dans un agenda.
    // date_from et date_to sont indépendants et cumulables.
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
        // FIX #1 — Inclusion du type dans la réponse pour la vue agenda
        type:         tasks.type,
        due_date:     tasks.due_date,
        completed_at: tasks.completed_at,
        created_at:   tasks.created_at,
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
      .leftJoin(leads, eq(tasks.lead_id, leads.id))
      .leftJoin(profiles, eq(tasks.assigned_to, profiles.id))
      .where(whereClause)
      .orderBy(
        // Tri : urgente > haute > moyenne > basse, puis par date d'échéance
        sql`CASE ${tasks.priority}
          WHEN 'urgente' THEN 1
          WHEN 'haute'   THEN 2
          WHEN 'moyenne' THEN 3
          WHEN 'basse'   THEN 4
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
      .select()
      .from(tasks)
      .leftJoin(contacts, eq(tasks.contact_id, contacts.id))
      .leftJoin(leads, eq(tasks.lead_id, leads.id))
      .where(eq(tasks.id, id))
      .limit(1)

    if (!task) throw new NotFoundException('Tâche introuvable')

    if (user.role !== 'admin' && task.tasks.assigned_to !== user.id) {
      throw new ForbiddenException('Accès refusé')
    }

    return task
  }

  async create(dto: CreateTaskDto, userId: string) {
    const [newTask] = await db
      .insert(tasks)
      .values({
        title:       dto.title,
        description: dto.description,
        status:      dto.status ?? 'à_faire',
        priority:    dto.priority ?? 'moyenne',
        // FIX #1 — Persistance du type de tâche (défaut : 'tâche')
        type:        dto.type ?? 'tâche',
        due_date:    dto.due_date ? new Date(dto.due_date) : undefined,
        contact_id:  dto.contact_id,
        lead_id:     dto.lead_id,
        company_id:  dto.company_id,
        assigned_to: dto.assigned_to ?? userId,
        created_by:  userId,
      })
      .returning()

    return newTask
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthUser) {
    await this.findOne(id, user) // Vérifie existence + accès

    const updatePayload: any = {
      ...dto,
      updated_at: new Date(),
    }

    // Si on passe la tâche à 'terminée', on enregistre la date
    if (dto.status === 'terminée' && !dto.completed_at) {
      updatePayload.completed_at = new Date()
    }
    // Si on repasse la tâche à un statut actif, on reset completed_at
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

  // Stats pour le dashboard
  async getStats(userId: string, role: string) {
    const isAdmin = role === 'admin'
    const cond = isAdmin ? undefined : eq(tasks.assigned_to, userId)

    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'à_faire')                     AS todo,
        COUNT(*) FILTER (WHERE status = 'en_cours')                    AS in_progress,
        COUNT(*) FILTER (WHERE status = 'terminée')                    AS done,
        COUNT(*) FILTER (
          WHERE status NOT IN ('terminée','annulée')
            AND due_date < NOW()
        )                                                               AS overdue,
        COUNT(*) FILTER (
          WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
            AND status NOT IN ('terminée','annulée')
        )                                                               AS due_soon
      FROM tasks
      ${!isAdmin ? sql`WHERE assigned_to = ${userId}` : sql``}
    `)
    const stats = result.rows[0];
    
    return {
      todo:        Number((stats as any).todo),
      in_progress: Number((stats as any).in_progress),
      done:        Number((stats as any).done),
      overdue:     Number((stats as any).overdue),
      due_soon:    Number((stats as any).due_soon),
    }
  }
}
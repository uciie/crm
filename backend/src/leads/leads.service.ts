// ============================================================
// leads/leads.service.ts  — with email triggers
// Diff vs original: constructor + EmailService injected,
// sendLeadAssigned() called after create(), sendDealStageChanged
// available for pipeline moves.
// ============================================================

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { db } from '../database/db.config'
import { leads, contacts, companies, profiles } from '../database/schema'
import { eq, and, or, ilike, desc, sql, isNull } from 'drizzle-orm'
import { CreateLeadDto } from './dto/create-lead.dto'
import { EmailService }  from '../email/email.service'   // ← NEW

export interface AuthUser {
  id:   string
  role: 'admin' | 'commercial' | 'utilisateur'
}

export interface LeadFilters {
  search?:      string
  status?:      string
  contact_id?:  string
  company_id?:  string
  assigned_to?: string
  page?:        number
  limit?:       number
}

@Injectable()
export class LeadsService {

  constructor(private readonly emailService: EmailService) {} // ← NEW

  async findAll(user: AuthUser, filters: LeadFilters = {}) {
    // ── Permissions: "utilisateur" n'a accès qu'aux leads non assignés ou qui lui sont assignés
    if (user.role === 'utilisateur') {
      throw new ForbiddenException('Accès aux leads non autorisé.')
    }

    const { search, status, contact_id, company_id, assigned_to, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions: any[] = []
    // Les commerciaux voient leurs leads, les admins peuvent filtrer par assigned_to
    if (user.role == 'commercial') {
      conditions.push(or(eq(leads.assigned_to, user.id)))
    } else if (user.role === 'admin' && assigned_to) {
      conditions.push(eq(leads.assigned_to, assigned_to))
    }

    if (search)     conditions.push(ilike(leads.title, `%${search}%`))
    if (status)     conditions.push(eq(leads.status, status as any))
    if (contact_id) conditions.push(eq(leads.contact_id, contact_id))
    if (company_id) conditions.push(eq(leads.company_id, company_id))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id:                  leads.id,
        title:               leads.title,
        status:              leads.status,
        value:               leads.value,
        probability:         leads.probability,
        expected_close_date: leads.expected_close_date,
        source:              leads.source,
        lost_reason:         leads.lost_reason,
        notes:               leads.notes,
        created_at:          leads.created_at,
        updated_at:          leads.updated_at,
        contact: {
          id:         contacts.id,
          first_name: contacts.first_name,
          last_name:  contacts.last_name,
          email:      contacts.email,
          avatar_url: contacts.avatar_url,
        },
        company: {
          id:       companies.id,
          name:     companies.name,
          logo_url: companies.logo_url,
        },
        assignee: {
          id:         profiles.id,
          full_name:  profiles.full_name,
          avatar_url: profiles.avatar_url,
        },
      })
      .from(leads)
      .leftJoin(contacts,  eq(leads.contact_id,  contacts.id))
      .leftJoin(companies, eq(leads.company_id,  companies.id))
      .leftJoin(profiles,  eq(leads.assigned_to, profiles.id))
      .where(whereClause)
      .orderBy(desc(leads.updated_at))
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(whereClause)

    return {
      data: rows,
      pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) },
    }
  }

  async findOne(id: string, user: AuthUser) {
    // ── Permissions: "utilisateur" n'a accès qu'aux leads non assignés ou qui lui sont assignés
    if (user.role === 'utilisateur') {
      throw new ForbiddenException('Accès aux leads non autorisé.')
    }
    const [lead] = await db
      .select()
      .from(leads)
      .leftJoin(contacts,  eq(leads.contact_id,  contacts.id))
      .leftJoin(companies, eq(leads.company_id,  companies.id))
      .leftJoin(profiles,  eq(leads.assigned_to, profiles.id))
      .where(eq(leads.id, id))
      .limit(1)

    if (!lead) throw new NotFoundException('Lead introuvable')

    // Vérification d'accès : les commerciaux ne peuvent voir que leurs leads ou les leads non assignés
    if (user.role === 'commercial' && lead.leads.assigned_to !== user.id) {
      throw new ForbiddenException('Accès refusé')
    }

    return lead
  }

  async create(dto: CreateLeadDto, userId: string) {
    const [newLead] = await db
      .insert(leads)
      .values({
        title:               dto.title,
        status:              dto.status ?? 'nouveau',
        value:               dto.value?.toString(),
        probability:         dto.probability ?? 0,
        expected_close_date: dto.expected_close_date,
        contact_id:          dto.contact_id,
        company_id:          dto.company_id,
        assigned_to:         dto.assigned_to ?? userId,
        source:              dto.source,
        lost_reason:         dto.lost_reason,
        notes:               dto.notes,
        created_by:          userId,
      })
      .returning()

    // ── Email trigger — notify the assignee ─────────────────
    // Fire-and-forget: never block the HTTP response for email sending
    if (newLead.assigned_to) {
      // Fetch the contact name if linked (best-effort)
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
        .sendLeadAssigned({
          assigneeId:   newLead.assigned_to,
          leadId:       newLead.id,
          leadTitle:    newLead.title,
          contactName,
          leadValue:    dto.value,
          createdById:  userId,
        })
        .catch(err => console.error('[LeadsService] sendLeadAssigned failed:', err?.message))
    }

    return newLead
  }

  async update(id: string, dto: Partial<CreateLeadDto>, user: AuthUser) {
    if (user.role === 'utilisateur') {
      throw new ForbiddenException('Permission insuffisante.')
    }
    await this.findOne(id, user)

    const updatePayload: any = { ...dto, updated_at: new Date() }
    if (dto.value !== undefined)       updatePayload.value = dto.value?.toString()
    if (dto.expected_close_date)       updatePayload.expected_close_date = dto.expected_close_date

    const [updated] = await db
      .update(leads)
      .set(updatePayload)
      .where(eq(leads.id, id))
      .returning()

    return updated
  }

  async remove(id: string, user: AuthUser) {
    if (user.role !== 'admin') throw new ForbiddenException('Seul un admin peut supprimer un lead.')

    const [deleted] = await db
      .delete(leads)
      .where(eq(leads.id, id))
      .returning({ id: leads.id })

    if (!deleted) throw new NotFoundException('Lead introuvable')
    return { message: 'Lead supprimé avec succès', id: deleted.id }
  }

  async getStats(userId: string, role: string) {
    const isAdmin = role === 'admin'

    const result = await db.execute(sql`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'gagné')          AS won,
        COUNT(*) FILTER (WHERE status = 'perdu')          AS lost,
        COALESCE(SUM(value) FILTER (WHERE status = 'gagné'), 0) AS revenue_won,
        COALESCE(SUM(value), 0)                           AS pipeline_value,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', current_date)) AS new_this_month
      FROM leads
      ${!isAdmin ? sql`WHERE assigned_to = ${userId}` : sql``}
    `)

    const stats = result.rows[0] as any
    const conversionRate = Number(stats.total) > 0
      ? Math.round((Number(stats.won) / Number(stats.total)) * 100)
      : 0

    return {
      total:           Number(stats.total),
      won:             Number(stats.won),
      lost:            Number(stats.lost),
      revenue_won:     Number(stats.revenue_won),
      pipeline_value:  Number(stats.pipeline_value),
      new_this_month:  Number(stats.new_this_month),
      conversion_rate: conversionRate,
    }
  }
}
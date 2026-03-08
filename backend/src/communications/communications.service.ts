// ============================================================
// communications/communications.service.ts
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common'
import { db }                            from '../database/db.config'
import { communications, profiles, emailCampaigns } from '../database/schema'
import { eq, and, desc, sql }            from 'drizzle-orm'
import { EmailService }                  from '../email/email.service'
import { CreateCommunicationDto }        from './dto/create-communication.dto'

@Injectable()
export class CommunicationsService {
  constructor(private readonly emailService: EmailService) {}

  // ── Timeline (GET /communications/timeline?contact_id=) ────

  async getTimeline(filters: {
    contact_id?: string
    lead_id?:    string
    limit?:      number
  }) {
    const { contact_id, lead_id, limit = 50 } = filters

    const conditions: any[] = []
    if (contact_id) conditions.push(eq(communications.contact_id, contact_id))
    if (lead_id)    conditions.push(eq(communications.lead_id,    lead_id))

    const rows = await db
      .select({
        id:               communications.id,
        type:             communications.type,
        subject:          communications.subject,
        body:             communications.body,
        direction:        communications.direction,
        duration_min:     communications.duration_min,
        occurred_at:      communications.occurred_at,
        brevo_message_id: communications.brevo_message_id,
        created_at:       communications.created_at,
        author: {
          id:         profiles.id,
          full_name:  profiles.full_name,
          avatar_url: profiles.avatar_url,
        },
      })
      .from(communications)
      .leftJoin(profiles, eq(communications.created_by, profiles.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(communications.occurred_at))
      .limit(limit)

    return { data: rows }
  }

  // ── Create (POST /communications) ─────────────────────────

  async create(dto: CreateCommunicationDto, userId: string) {
    const [newComm] = await db
      .insert(communications)
      .values({
        type:         dto.type,
        subject:      dto.subject,
        body:         dto.body,
        direction:    dto.direction ?? 'sortant',
        duration_min: dto.duration_min,
        occurred_at:  new Date(),
        contact_id:   dto.contact_id ?? null,
        lead_id:      dto.lead_id    ?? null,
        company_id:   dto.company_id ?? null,
        created_by:   userId,
      })
      .returning()

    return newComm
  }

  // ── Delete (DELETE /communications/:id) ───────────────────

  async remove(id: string, userId: string) {
    const [deleted] = await db
      .delete(communications)
      .where(
        and(
          eq(communications.id, id),
          eq(communications.created_by, userId),
        )
      )
      .returning({ id: communications.id })

    if (!deleted) throw new NotFoundException('Communication introuvable ou accès refusé.')
    return { message: 'Communication supprimée', id: deleted.id }
  }

  // ── Stats summary ─────────────────────────────────────────

  async getStats(userId: string, role: string) {
    const isAdmin = role === 'admin'

    const result = await db.execute(sql`
      SELECT
        COUNT(*)                                             AS total,
        COUNT(*) FILTER (WHERE type = 'email')              AS emails,
        COUNT(*) FILTER (WHERE type = 'appel')              AS calls,
        COUNT(*) FILTER (WHERE type = 'réunion')            AS meetings,
        COUNT(*) FILTER (WHERE type = 'note')               AS notes,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('month', current_date)
        )                                                    AS this_month
      FROM communications
      ${!isAdmin ? sql`WHERE created_by = ${userId}` : sql``}
    `)

    const row = result.rows[0] as any
    return {
      total:      Number(row.total),
      emails:     Number(row.emails),
      calls:      Number(row.calls),
      meetings:   Number(row.meetings),
      notes:      Number(row.notes),
      this_month: Number(row.this_month),
    }
  }

  // ── Campaign stats sync ───────────────────────────────────

  /**
   * Avec Resend, il n'y a pas d'API campaigns.
   * Les stats sont mises à jour via les webhooks Resend (email.delivered,
   * email.opened, email.clicked…) directement dans webhooks.controller.ts.
   * Cette méthode est conservée pour ne pas casser le controller existant.
   */
  async syncCampaignStats(): Promise<{ synced: number; failed: number }> {
    return { synced: 0, failed: 0 }
  }
}
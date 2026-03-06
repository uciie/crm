// ============================================================
// pipeline/pipeline.service.ts — with email triggers
// Diff vs original: EmailService injected + called in moveDeal()
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '../database/db.config'
import { pipelineDeals, pipelineStages, leads, contacts, companies, profiles } from '../database/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { EmailService } from '../email/email.service' 

@Injectable()
export class PipelineService {

  constructor(private readonly emailService: EmailService) {} 

  async getKanbanBoard(userId: string, role: string) {
    const isAdmin = role === 'admin'

    const stages = await db
      .select()
      .from(pipelineStages)
      .orderBy(pipelineStages.order_index)

    const dealsQuery = await db
      .select({
        deal_id:          pipelineDeals.id,
        stage_id:         pipelineDeals.stage_id,
        entered_stage_at: pipelineDeals.entered_stage_at,
        lead: {
          id:          leads.id,
          title:       leads.title,
          status:      leads.status,
          value:       leads.value,
          probability: leads.probability,
          expected_close_date: leads.expected_close_date,
          source:      leads.source,
          assigned_to: leads.assigned_to,
        },
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
      .from(pipelineDeals)
      .leftJoin(leads,    eq(pipelineDeals.lead_id, leads.id))
      .leftJoin(contacts, eq(leads.contact_id, contacts.id))
      .leftJoin(companies,eq(leads.company_id, companies.id))
      .leftJoin(profiles, eq(leads.assigned_to, profiles.id))
      .orderBy(desc(pipelineDeals.entered_stage_at))

    const filteredDeals = isAdmin
      ? dealsQuery
      : dealsQuery.filter(d => d.lead?.assigned_to === userId)

    const kanban = stages.map(stage => ({
      ...stage,
      deals: filteredDeals.filter(d => d.stage_id === stage.id),
      total_value: filteredDeals
        .filter(d => d.stage_id === stage.id)
        .reduce((sum, d) => sum + Number(d.lead?.value ?? 0), 0),
    }))

    return kanban
  }

  async moveDeal(dealId: string, newStageId: string, movedByUserId?: string) {
    // ── 1. Resolve target stage ────────────────────────────
    const [stage] = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, newStageId))
      .limit(1)

    if (!stage) throw new NotFoundException('Étape introuvable')

    // ── 2. Fetch current deal to get the old stage ────────
    const [currentDeal] = await db
      .select({ stage_id: pipelineDeals.stage_id, lead_id: pipelineDeals.lead_id })
      .from(pipelineDeals)
      .where(eq(pipelineDeals.id, dealId))
      .limit(1)

    let oldStageName = ''
    if (currentDeal?.stage_id) {
      const [oldStage] = await db
        .select({ stage: pipelineStages.stage })
        .from(pipelineStages)
        .where(eq(pipelineStages.id, currentDeal.stage_id))
        .limit(1)
      oldStageName = oldStage?.stage ?? ''
    }

    // ── 3. Update deal ─────────────────────────────────────
    const [updatedDeal] = await db
      .update(pipelineDeals)
      .set({ stage_id: newStageId, entered_stage_at: new Date(), updated_at: new Date() })
      .where(eq(pipelineDeals.id, dealId))
      .returning()

    // ── 4. Sync lead status ────────────────────────────────
    const stageToStatus: Record<string, string> = {
      prospect:      'nouveau',
      qualification: 'qualifié',
      proposition:   'proposition',
      négociation:   'négociation',
      gagné:         'gagné',
      perdu:         'perdu',
    }

    const newStatus = stageToStatus[stage.stage]
    if (newStatus && updatedDeal) {
      await db
        .update(leads)
        .set({ status: newStatus as any, updated_at: new Date() })
        .where(eq(leads.id, updatedDeal.lead_id))
    }

    // ── 5. Email trigger — notify assignee ────────────────
    if (updatedDeal && movedByUserId) {
      const [lead] = await db
        .select({ title: leads.title, assigned_to: leads.assigned_to })
        .from(leads)
        .where(eq(leads.id, updatedDeal.lead_id))
        .limit(1)

      if (lead?.assigned_to) {
        this.emailService
          .sendDealStageChanged({
            assigneeId:  lead.assigned_to,
            leadId:      updatedDeal.lead_id,
            leadTitle:   lead.title,
            oldStage:    oldStageName,
            newStage:    stage.stage,
            createdById: movedByUserId,
          })
          .catch(err => console.error('[PipelineService] sendDealStageChanged failed:', err?.message))
      }
    }

    return updatedDeal
  }

  async getPipelineStats(userId: string, role: string) {
    const isAdmin = role === 'admin'

    const stats = await db.execute(sql`
      SELECT
        ps.name                           AS stage_name,
        ps.stage                          AS stage_key,
        ps.color,
        COUNT(pd.id)                      AS deal_count,
        COALESCE(SUM(l.value), 0)         AS total_value,
        COALESCE(AVG(l.probability), 0)   AS avg_probability
      FROM pipeline_stages ps
      LEFT JOIN pipeline_deals pd ON pd.stage_id = ps.id
      LEFT JOIN leads l ON l.id = pd.lead_id
        ${isAdmin ? sql`` : sql`AND l.assigned_to = ${userId}`}
      GROUP BY ps.id, ps.name, ps.stage, ps.color, ps.order_index
      ORDER BY ps.order_index
    `)

    const weightedRevenue = (stats.rows as any[]).reduce((sum: number, s: any) => {
      return sum + (Number(s.total_value) * Number(s.avg_probability) / 100)
    }, 0)

    return {
      stages: stats.rows,
      weighted_revenue: Math.round(weightedRevenue),
    }
  }

  async createDeal(leadId: string, stageId?: string) {
    let targetStageId = stageId
    if (!targetStageId) {
      const [firstStage] = await db
        .select()
        .from(pipelineStages)
        .orderBy(pipelineStages.order_index)
        .limit(1)
      targetStageId = firstStage.id
    }

    const [deal] = await db
      .insert(pipelineDeals)
      .values({ lead_id: leadId, stage_id: targetStageId })
      .returning()

    return deal
  }
}
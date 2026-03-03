import { Injectable, NotFoundException } from '@nestjs/common'
import { db } from '../database/db.config'
import {
  pipelineDeals, pipelineStages, leads, contacts, companies, profiles
} from '../database/schema'
import { eq, desc, sql } from 'drizzle-orm'

@Injectable()
export class PipelineService {
  // Récupère tout le pipeline sous forme de colonnes Kanban
  async getKanbanBoard(userId: string, role: string) {
    const isAdmin = role === 'admin'

    // Récupère toutes les étapes triées
    const stages = await db
      .select()
      .from(pipelineStages)
      .orderBy(pipelineStages.order_index)

    // Récupère tous les deals avec leurs infos
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
          id:        profiles.id,
          full_name: profiles.full_name,
          avatar_url: profiles.avatar_url,
        },
      })
      .from(pipelineDeals)
      .leftJoin(leads, eq(pipelineDeals.lead_id, leads.id))
      .leftJoin(contacts, eq(leads.contact_id, contacts.id))
      .leftJoin(companies, eq(leads.company_id, companies.id))
      .leftJoin(profiles, eq(leads.assigned_to, profiles.id))
      .orderBy(desc(pipelineDeals.entered_stage_at))

    // Filtre par commercial si pas admin
    const filteredDeals = isAdmin
      ? dealsQuery
      : dealsQuery.filter(d => d.lead?.assigned_to === userId)

    // Construit la structure Kanban { [stage_id]: deals[] }
    const kanban = stages.map(stage => ({
      ...stage,
      deals: filteredDeals.filter(d => d.stage_id === stage.id),
      total_value: filteredDeals
        .filter(d => d.stage_id === stage.id)
        .reduce((sum, d) => sum + Number(d.lead?.value ?? 0), 0),
    }))

    return kanban
  }

  // Déplace un deal vers une nouvelle étape (drag & drop)
  async moveDeal(dealId: string, newStageId: string) {
    const stage = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, newStageId))
      .limit(1)

    if (!stage[0]) throw new NotFoundException('Étape introuvable')

    const [updatedDeal] = await db
      .update(pipelineDeals)
      .set({
        stage_id:         newStageId,
        entered_stage_at: new Date(),
        updated_at:       new Date(),
      })
      .where(eq(pipelineDeals.id, dealId))
      .returning()

    // Met à jour le statut du lead en conséquence
    if (updatedDeal) {
      const stageToStatus: Record<string, string> = {
        prospect:      'nouveau',
        qualification: 'qualifié',
        proposition:   'proposition',
        négociation:   'négociation',
        gagné:         'gagné',
        perdu:         'perdu',
      }
      const newStatus = stageToStatus[stage[0].stage]
      if (newStatus) {
        await db
          .update(leads)
          .set({ status: newStatus as any, updated_at: new Date() })
          .where(eq(leads.id, updatedDeal.lead_id))
      }
    }

    return updatedDeal
  }

  // Statistiques du pipeline pour le dashboard
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

    // Calcul du CA pondéré (weighted revenue)
    const weightedRevenue = (stats.rows as any[]).reduce((sum: number, s: any) => {
      return sum + (Number(s.total_value) * Number(s.avg_probability) / 100)
    }, 0)

    return {
      stages: stats.rows,
      weighted_revenue: Math.round(weightedRevenue),
    }
  }

  // Crée un nouveau deal dans le pipeline
  async createDeal(leadId: string, stageId?: string) {
    // Par défaut : première étape (Prospect)
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
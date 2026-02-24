import { Injectable } from '@nestjs/common'
import { db } from '../database/db.config'
import { leads, contacts, tasks, communications, profiles } from '../database/schema'
import { eq, and, gte, sql, desc } from 'drizzle-orm'

@Injectable()
export class DashboardService {
  async getKpis(userId: string, role: string) {
    const isAdmin = role === 'admin'
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    // CA total des leads gagnés ce mois
    const revenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(value), 0) AS revenue
      FROM leads
      WHERE status = 'gagné'
        AND updated_at >= ${startOfMonth}
        ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
    `)

    // Taux de conversion (leads gagnés / total leads)
    const conversionResult = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'gagné') AS won,
        COUNT(*) AS total
      FROM leads
      WHERE created_at >= ${startOfMonth}
        ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
    `)

    // Tâches en retard
    const overdueResult = await db.execute(sql`
      SELECT COUNT(*) AS overdue
      FROM tasks
      WHERE status NOT IN ('terminée', 'annulée')
        AND due_date < NOW()
        AND assigned_to = ${userId}
    `)

    // Nouveaux contacts ce mois
    const newContactsResult = await db.execute(sql`
      SELECT COUNT(*) AS new_contacts
      FROM contacts
      WHERE created_at >= ${startOfMonth}
        ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
    `)

    const conv = conversionResult as any
    const conversionRate = Number(conv.total) > 0
      ? Math.round((Number(conv.won) / Number(conv.total)) * 100)
      : 0

    return {
      revenue_this_month: Number((revenueResult as any).revenue),
      conversion_rate:    conversionRate,
      overdue_tasks:      Number((overdueResult as any).overdue),
      new_contacts:       Number((newContactsResult as any).new_contacts),
    }
  }

  async getLeadsByStatus(userId: string, role: string) {
    const isAdmin = role === 'admin'

    const result = await db.execute(sql`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(value), 0) AS total_value
      FROM leads
      ${!isAdmin ? sql`WHERE assigned_to = ${userId}` : sql``}
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'nouveau'      THEN 1
          WHEN 'contacté'     THEN 2
          WHEN 'qualifié'     THEN 3
          WHEN 'proposition'  THEN 4
          WHEN 'négociation'  THEN 5
          WHEN 'gagné'        THEN 6
          WHEN 'perdu'        THEN 7
        END
    `)

    return result.rows
  }

  async getActivityFeed(userId: string, role: string, limit = 10) {
    const isAdmin = role === 'admin'

    const activities = await db.execute(sql`
      SELECT
        'communication' AS type,
        c.id,
        c.type AS subtype,
        c.subject AS title,
        c.occurred_at AS date,
        p.full_name AS actor,
        co.first_name || ' ' || co.last_name AS target
      FROM communications c
      LEFT JOIN profiles p ON p.id = c.created_by
      LEFT JOIN contacts co ON co.id = c.contact_id
      ${!isAdmin ? sql`WHERE c.created_by = ${userId}` : sql``}

      UNION ALL

      SELECT
        'lead' AS type,
        l.id,
        l.status AS subtype,
        l.title,
        l.updated_at AS date,
        p.full_name AS actor,
        co.first_name || ' ' || co.last_name AS target
      FROM leads l
      LEFT JOIN profiles p ON p.id = l.assigned_to
      LEFT JOIN contacts co ON co.id = l.contact_id
      ${!isAdmin ? sql`WHERE l.assigned_to = ${userId}` : sql``}

      ORDER BY date DESC
      LIMIT ${limit}
    `)

    return activities.rows
  }

  async getTopCommercials() {
    const result = await db.execute(sql`
      SELECT
        p.id,
        p.full_name,
        p.avatar_url,
        COUNT(l.id) FILTER (WHERE l.status = 'gagné') AS deals_won,
        COALESCE(SUM(l.value) FILTER (WHERE l.status = 'gagné'), 0) AS revenue
      FROM profiles p
      LEFT JOIN leads l ON l.assigned_to = p.id
        AND l.updated_at >= date_trunc('month', current_date)
      WHERE p.role IN ('admin', 'commercial')
      GROUP BY p.id, p.full_name, p.avatar_url
      ORDER BY revenue DESC
      LIMIT 5
    `)

    return result.rows
  }
}

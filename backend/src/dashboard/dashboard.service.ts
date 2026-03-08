import { Injectable } from '@nestjs/common'
import { db } from '../database/db.config'
import { leads, contacts, tasks, communications, profiles } from '../database/schema'
import { sql } from 'drizzle-orm'

// ── Types de retour explicites (fix §5.2 — suppression des casts `any`) ──────

export interface KpiResult {
  // Commerciaux
  revenue_this_month:  number
  conversion_rate:     number   // pourcentage 0-100
  pipeline_total:      number   // FIX §1.3 — montant total du pipeline actif
  // Contacts
  total_contacts:      number   // FIX §2.1 — compteur global
  new_contacts:        number   // nouveaux ce mois-ci
  // Tâches
  overdue_tasks:       number
  urgent_tasks:        number   // FIX §4.4 — tâches priorité haute/urgente
  // Agenda
  todays_appointments: AppointmentRow[]  // FIX §4.3 — RDV du jour
  // Valeurs de la période précédente — consommées par calculateTrend() côté frontend
  prev_revenue:         number
  prev_conversion_rate: number
  prev_new_contacts:    number
  prev_overdue_tasks:   number
}

export interface AppointmentRow {
  id:       string
  title:    string
  due_date: string
}

export interface LeadsByStatusRow {
  status:      string
  count:       number
  total_value: number
}

export interface LeadsBySourceRow {
  source:      string | null
  total_leads: number
  won_leads:   number
  revenue:     number
  win_rate:    number   // pourcentage 0-100
}

export interface ContactsBySegmentRow {
  segment: string | null
  count:   number
}

export interface LtvRow {
  contact_id:   string
  first_name:   string
  last_name:    string
  company_name: string | null
  ltv:          number
  deals_count:  number
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {

  // ── Helpers privés ──────────────────────────────────────────────────────────

  /**
   * Détermine la plage de dates à partir des paramètres de requête optionnels.
   * FIX §1.1 — filtre de période paramétrable (mois/trimestre/année custom).
   *
   * Priorité :
   *   1. startDate + endDate fournis explicitement
   *   2. Sinon : mois en cours (comportement précédent conservé par défaut)
   */
  private resolveDateRange(startDate?: string, endDate?: string): { start: Date; end: Date } {
    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) }
    }

    // Par défaut : du 1er jour du mois courant à maintenant
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end: now }
  }

  /**
   * Calcule la plage de la période précédente de durée équivalente à la plage courante.
   * Utilisé pour alimenter les indicateurs de tendance (prev_*) retournés dans KpiResult.
   *
   * Exemple : si la période courante est janvier 2025 (31 jours),
   * la période précédente sera décembre 2024 (31 jours avant le 1er janvier).
   */
  private resolvePreviousDateRange(
    startDate?: string,
    endDate?:   string,
  ): { start: Date; end: Date } {
    const { start, end } = this.resolveDateRange(startDate, endDate)
    const durationMs     = end.getTime() - start.getTime()

    return {
      start: new Date(start.getTime() - durationMs),
      end:   new Date(start.getTime()),
    }
  }

  // ── getKpis ─────────────────────────────────────────────────────────────────

  /**
   * GET /dashboard/kpis
   *
   * Retourne tous les indicateurs clés de la page d'accueil en une seule
   * requête parallèle. Supporte désormais un filtre de période personnalisé.
   * Retourne également les valeurs de la période précédente (prev_*) pour
   * permettre le calcul de tendance côté frontend via `calculateTrend`.
   *
   * @param startDate  ISO date string (ex: "2025-01-01") — optionnel
   * @param endDate    ISO date string (ex: "2025-03-31") — optionnel
   */
  async getKpis(
    userId:    string,
    role:      string,
    startDate?: string,
    endDate?:   string,
  ): Promise<KpiResult> {
    const isAdmin              = role === 'admin'
    const { start, end }       = this.resolveDateRange(startDate, endDate)
    const { start: prevStart, end: prevEnd } = this.resolvePreviousDateRange(startDate, endDate)

    // ── Toutes les requêtes lancées en parallèle ────────────────────────────
    const [
      revenueRows,
      conversionRows,
      pipelineRows,
      overdueRows,
      urgentRows,
      newContactsRows,
      totalContactsRows,
      appointmentsRows,
      // Période précédente
      prevRevenueRows,
      prevConversionRows,
      prevNewContactsRows,
      prevOverdueRows,
    ] = await Promise.all([

      // §1.2 — CA des leads gagnés sur la période
      db.execute(sql`
        SELECT COALESCE(SUM(value), 0) AS revenue
        FROM leads
        WHERE status    = 'gagné'
          AND updated_at >= ${start}
          AND updated_at <= ${end}
          ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      `),

      // §1.4 — Taux de conversion sur la période
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'gagné') AS won,
          COUNT(*)                                  AS total
        FROM leads
        WHERE created_at >= ${start}
          AND created_at <= ${end}
          ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      `),

      // §1.3 — Pipeline total (leads actifs hors gagné/perdu)
      db.execute(sql`
        SELECT COALESCE(SUM(value), 0) AS pipeline_total
        FROM leads
        WHERE status NOT IN ('gagné', 'perdu')
          ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      `),

      // §4.4a — Tâches en retard
      db.execute(sql`
        SELECT COUNT(*) AS overdue
        FROM tasks
        WHERE status  NOT IN ('terminée', 'annulée')
          AND due_date < NOW()
          AND assigned_to = ${userId}
      `),

      // §4.4b — Tâches urgentes non terminées (priorité haute ou urgente)
      db.execute(sql`
        SELECT COUNT(*) AS urgent
        FROM tasks
        WHERE priority    IN ('urgente', 'haute')
          AND status      NOT IN ('terminée', 'annulée')
          AND due_date    >= NOW()
          AND assigned_to  = ${userId}
      `),

      // Nouveaux contacts sur la période
      db.execute(sql`
        SELECT COUNT(*) AS new_contacts
        FROM contacts
        WHERE created_at >= ${start}
          AND created_at <= ${end}
          ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      `),

      // §2.1 — Total contacts (tous temps)
      db.execute(sql`
        SELECT COUNT(*) AS total_contacts
        FROM contacts
        WHERE (${isAdmin} = true OR assigned_to = ${userId})
      `),

      // §4.3 — Rendez-vous du jour
      db.execute(sql`
        SELECT id, title, due_date
        FROM tasks
        WHERE type        = 'rendez-vous'
          AND status      NOT IN ('terminée', 'annulée')
          AND due_date::date = CURRENT_DATE
          AND assigned_to = ${userId}
        ORDER BY due_date ASC
      `),

      // Période précédente — CA
      db.execute(sql`
        SELECT COALESCE(SUM(value), 0) AS revenue
        FROM leads
        WHERE status    = 'gagné'
          AND updated_at >= ${prevStart}
          AND updated_at <= ${prevEnd}
          ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      `),

      // Période précédente — Taux de conversion
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'gagné') AS won,
          COUNT(*)                                  AS total
        FROM leads
        WHERE created_at >= ${prevStart}
          AND created_at <= ${prevEnd}
          ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      `),

      // Période précédente — Nouveaux contacts
      db.execute(sql`
        SELECT COUNT(*) AS new_contacts
        FROM contacts
        WHERE created_at >= ${prevStart}
          AND created_at <= ${prevEnd}
          ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      `),

      // Période précédente — Tâches en retard (snapshot à la fin de la période précédente)
      db.execute(sql`
        SELECT COUNT(*) AS overdue
        FROM tasks
        WHERE status  NOT IN ('terminée', 'annulée')
          AND due_date < ${prevEnd}
          AND due_date >= ${prevStart}
          AND assigned_to = ${userId}
      `),
    ])

    // ── Extraction et calculs — période courante ─────────────────────────────
    const revRow  = (revenueRows.rows[0]    ?? {}) as Record<string, unknown>
    const convRow = (conversionRows.rows[0] ?? {}) as Record<string, unknown>
    const pipRow  = (pipelineRows.rows[0]   ?? {}) as Record<string, unknown>
    const odRow   = (overdueRows.rows[0]    ?? {}) as Record<string, unknown>
    const urgRow  = (urgentRows.rows[0]     ?? {}) as Record<string, unknown>
    const ncRow   = (newContactsRows.rows[0]   ?? {}) as Record<string, unknown>
    const tcRow   = (totalContactsRows.rows[0] ?? {}) as Record<string, unknown>

    const won   = Number(convRow.won   ?? 0)
    const total = Number(convRow.total ?? 0)

    // ── Extraction et calculs — période précédente ───────────────────────────
    const prevRevRow  = (prevRevenueRows.rows[0]     ?? {}) as Record<string, unknown>
    const prevConvRow = (prevConversionRows.rows[0]  ?? {}) as Record<string, unknown>
    const prevNcRow   = (prevNewContactsRows.rows[0] ?? {}) as Record<string, unknown>
    const prevOdRow   = (prevOverdueRows.rows[0]     ?? {}) as Record<string, unknown>

    const prevWon   = Number(prevConvRow.won   ?? 0)
    const prevTotal = Number(prevConvRow.total ?? 0)

    return {
      revenue_this_month:  Number(revRow.revenue         ?? 0),
      conversion_rate:     total > 0 ? Math.round((won / total) * 100) : 0,
      pipeline_total:      Number(pipRow.pipeline_total  ?? 0),
      overdue_tasks:       Number(odRow.overdue          ?? 0),
      urgent_tasks:        Number(urgRow.urgent          ?? 0),
      new_contacts:        Number(ncRow.new_contacts     ?? 0),
      total_contacts:      Number(tcRow.total_contacts   ?? 0),
      todays_appointments: (appointmentsRows.rows ?? []) as unknown as AppointmentRow[],
      // Valeurs de la période précédente — consommées par calculateTrend() côté frontend
      prev_revenue:         Number(prevRevRow.revenue      ?? 0),
      prev_conversion_rate: prevTotal > 0 ? Math.round((prevWon / prevTotal) * 100) : 0,
      prev_new_contacts:    Number(prevNcRow.new_contacts  ?? 0),
      prev_overdue_tasks:   Number(prevOdRow.overdue       ?? 0),
    }
  }

  // ── getLeadsByStatus ────────────────────────────────────────────────────────

  /**
   * GET /dashboard/leads-by-status
   * Supporte désormais un filtre de période optionnel.
   */
  async getLeadsByStatus(
    userId:    string,
    role:      string,
    startDate?: string,
    endDate?:   string,
  ): Promise<LeadsByStatusRow[]> {
    const isAdmin        = role === 'admin'
    const { start, end } = this.resolveDateRange(startDate, endDate)

    const result = await db.execute(sql`
      SELECT
        status,
        COUNT(*)                      AS count,
        COALESCE(SUM(value), 0)       AS total_value
      FROM leads
      WHERE created_at >= ${start}
        AND created_at <= ${end}
        ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'nouveau'     THEN 1
          WHEN 'contacté'    THEN 2
          WHEN 'qualifié'    THEN 3
          WHEN 'proposition' THEN 4
          WHEN 'négociation' THEN 5
          WHEN 'gagné'       THEN 6
          WHEN 'perdu'       THEN 7
        END
    `)

    return result.rows as unknown as LeadsByStatusRow[]
  }

  // ── getLeadsBySource ────────────────────────────────────────────────────────

  /**
   * GET /dashboard/leads-by-source    FIX §3.2 — nouvel endpoint
   *
   * Agrège les leads par canal d'acquisition (champ source).
   * Calcule le taux de conversion et le CA par source.
   */
  async getLeadsBySource(
    userId:    string,
    role:      string,
    startDate?: string,
    endDate?:   string,
  ): Promise<LeadsBySourceRow[]> {
    const isAdmin        = role === 'admin'
    const { start, end } = this.resolveDateRange(startDate, endDate)

    const result = await db.execute(sql`
      SELECT
        COALESCE(source, 'Non renseigné')                         AS source,
        COUNT(*)                                                   AS total_leads,
        COUNT(*) FILTER (WHERE status = 'gagné')                  AS won_leads,
        COALESCE(SUM(value) FILTER (WHERE status = 'gagné'), 0)   AS revenue
      FROM leads
      WHERE created_at >= ${start}
        AND created_at <= ${end}
        ${!isAdmin ? sql`AND assigned_to = ${userId}` : sql``}
      GROUP BY source
      ORDER BY total_leads DESC
    `)

    // Calcul du win_rate côté service (évite un CASE SQL lourd)
    return (result.rows as any[]).map(row => ({
      source:      row.source as string,
      total_leads: Number(row.total_leads),
      won_leads:   Number(row.won_leads),
      revenue:     Number(row.revenue),
      win_rate:    Number(row.total_leads) > 0
        ? Math.round((Number(row.won_leads) / Number(row.total_leads)) * 100)
        : 0,
    }))
  }

  // ── getContactsBySegment ────────────────────────────────────────────────────

  /**
   * GET /dashboard/contacts-by-segment   FIX §2.2 — nouvel endpoint
   *
   * Segmentation des contacts par secteur d'activité ou ville.
   * @param dimension  'industry' | 'city'  (défaut : 'industry')
   */
  async getContactsBySegment(
    userId:     string,
    role:       string,
    dimension:  'industry' | 'city' = 'industry',
  ): Promise<ContactsBySegmentRow[]> {
    const isAdmin = role === 'admin'

    const result = await db.execute(
      dimension === 'industry'
        ? sql`
            SELECT
              COALESCE(co.industry, 'Non renseigné') AS segment,
              COUNT(DISTINCT c.id)                   AS count
            FROM contacts c
            LEFT JOIN companies co ON co.id = c.company_id
            WHERE (${isAdmin} = true OR c.assigned_to = ${userId})
            GROUP BY co.industry
            ORDER BY count DESC
          `
        : sql`
            SELECT
              COALESCE(c.city, 'Non renseignée') AS segment,
              COUNT(*)                            AS count
            FROM contacts c
            WHERE (${isAdmin} = true OR c.assigned_to = ${userId})
            GROUP BY c.city
            ORDER BY count DESC
          `
    )

    return result.rows as unknown as ContactsBySegmentRow[]
  }

  // ── getLtv ──────────────────────────────────────────────────────────────────

  /**
   * GET /dashboard/ltv    FIX §2.3 — nouvel endpoint
   *
   * Calcule la Lifetime Value (LTV) par contact :
   * somme des opportunités gagnées rattachées au contact.
   */
  async getLtv(
    userId: string,
    role:   string,
    limit   = 20,
  ): Promise<LtvRow[]> {
    const isAdmin = role === 'admin'

    const result = await db.execute(sql`
      SELECT
        c.id                                          AS contact_id,
        c.first_name,
        c.last_name,
        co.name                                       AS company_name,
        COALESCE(SUM(l.value), 0)                     AS ltv,
        COUNT(l.id)                                   AS deals_count
      FROM contacts c
      LEFT JOIN leads    l  ON l.contact_id = c.id AND l.status = 'gagné'
      LEFT JOIN companies co ON co.id = c.company_id
      WHERE (${isAdmin} = true OR c.assigned_to = ${userId})
      GROUP BY c.id, c.first_name, c.last_name, co.name
      HAVING SUM(l.value) > 0
      ORDER BY ltv DESC
      LIMIT ${limit}
    `)

    return (result.rows as any[]).map(row => ({
      contact_id:   row.contact_id as string,
      first_name:   row.first_name as string,
      last_name:    row.last_name  as string,
      company_name: row.company_name as string | null,
      ltv:          Number(row.ltv),
      deals_count:  Number(row.deals_count),
    }))
  }

  // ── getActivityFeed ─────────────────────────────────────────────────────────

  /**
   * GET /dashboard/activity
   *
   * Utilise un CTE avec filtre booléen pour éviter l'injection conditionnelle
   * de WHERE à l'intérieur d'un UNION ALL, qui génère du SQL malformé avec
   * les fragments vides de Drizzle quand isAdmin = true.
   *
   * Pattern : WHERE (true = true OR assigned_to = $1)  — toutes les lignes (admin)
   *           WHERE (false = true OR assigned_to = $1) — filtre sur userId (commercial)
   */
  async getActivityFeed(userId: string, role: string, limit = 10) {
    const isAdmin = role === 'admin'

    const activities = await db.execute(sql`
      WITH comm_activity AS (
        SELECT
          'communication'::text                        AS type,
          c.id,
          c.type::text                                 AS subtype,
          c.subject                                    AS title,
          c.occurred_at                                AS date,
          p.full_name                                  AS actor,
          co.first_name || ' ' || co.last_name        AS target
        FROM communications c
        LEFT JOIN profiles p  ON p.id  = c.created_by
        LEFT JOIN contacts co ON co.id = c.contact_id
        WHERE (${isAdmin} = true OR c.created_by = ${userId})
      ),
      lead_activity AS (
        SELECT
          'lead'::text                                 AS type,
          l.id,
          l.status::text                               AS subtype,
          l.title,
          l.updated_at                                 AS date,
          p.full_name                                  AS actor,
          co.first_name || ' ' || co.last_name        AS target
        FROM leads l
        LEFT JOIN profiles p  ON p.id  = l.assigned_to
        LEFT JOIN contacts co ON co.id = l.contact_id
        WHERE (${isAdmin} = true OR l.assigned_to = ${userId})
      )
      SELECT * FROM comm_activity
      UNION ALL
      SELECT * FROM lead_activity
      ORDER BY date DESC
      LIMIT ${limit}
    `)

    return activities.rows
  }

  // ── getTopCommercials ───────────────────────────────────────────────────────

  /**
   * GET /dashboard/top-commercials
   * FIX §1.1 — période paramétrable (auparavant hardcodée sur le mois courant)
   */
  async getTopCommercials(startDate?: string, endDate?: string) {
    const { start, end } = this.resolveDateRange(startDate, endDate)

    const result = await db.execute(sql`
      SELECT
        p.id,
        p.full_name,
        p.avatar_url,
        COUNT(l.id) FILTER (WHERE l.status = 'gagné')                AS deals_won,
        COALESCE(SUM(l.value) FILTER (WHERE l.status = 'gagné'), 0)  AS revenue
      FROM profiles p
      LEFT JOIN leads l ON l.assigned_to = p.id
        AND l.updated_at >= ${start}
        AND l.updated_at <= ${end}
      WHERE p.role IN ('admin', 'commercial')
      GROUP BY p.id, p.full_name, p.avatar_url
      ORDER BY revenue DESC
      LIMIT 5
    `)

    return result.rows
  }
}
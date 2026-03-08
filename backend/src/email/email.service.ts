import { Injectable, Logger, OnModuleInit, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { db } from '../database/db.config'
import { emailCampaigns, communications, contacts, profiles } from '../database/schema'
import { eq } from 'drizzle-orm'
import { BREVO_TEMPLATES, validateTemplates } from './templates.config'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: { email: string; name: string }[]
  subject: string
  htmlContent: string
  senderName?: string
  senderEmail?: string
  replyTo?: string
  tags?: string[]
}

interface TransactionalEmailOptions {
  to: { email: string; name: string } | { email: string; name: string }[]
  templateId: number
  params: Record<string, any>
  contactId?: string
  leadId?:    string
  createdBy?: string
  subject?:   string
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger  = new Logger(EmailService.name)
  private readonly apiKey  = process.env.BREVO_API_KEY!
  private readonly baseUrl = 'https://api.brevo.com/v3'

  onModuleInit() {
    if (!this.apiKey) {
      this.logger.error('BREVO_API_KEY is not set — email sending will be disabled.')
      return
    }
    validateTemplates()
    this.logger.log('EmailService initialised ✔')
  }

  // ── HTTP helper ─────────────────────────────────────────────────────────────

  private async brevoRequest(endpoint: string, method: string, body?: any) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      this.logger.error(`Brevo API error ${res.status}: ${JSON.stringify(error)}`)
      throw new InternalServerErrorException(`Erreur Brevo: ${(error as any).message ?? res.statusText}`)
    }

    // 204 No Content → nothing to parse
    if (res.status === 204) return {}
    return res.json()
  }

  // ── Core transactional sender ───────────────────────────────────────────────

  /**
   * Send a Brevo template email.
   * Logs to `communications` table if contactId/leadId + createdBy are provided.
   * Returns the Brevo messageId, or null on failure.
   */
  async sendTransactional(options: TransactionalEmailOptions): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn('EmailService not initialised — skipping send.')
      return null
    }

    if (options.templateId === 0) {
      this.logger.warn(`templateId=0 — likely a missing env var. Skipping send.`)
      return null
    }

    const toArray = Array.isArray(options.to) ? options.to : [options.to]

    let result: any
    try {
      result = await this.brevoRequest('/smtp/email', 'POST', {
        to:         toArray,
        templateId: options.templateId,
        params:     options.params,
      })
    } catch (err: any) {
      this.logger.error(
        `Failed to send email — templateId=${options.templateId}: ${err?.message}`
      )
      return null
    }

    const messageId: string = result?.messageId ?? ''

    this.logger.debug(
      `Email sent — templateId=${options.templateId} to=${toArray.map(r => r.email).join(',')} messageId=${messageId}`
    )

    // Persist to communications if caller provided the context
    if (options.createdBy && (options.contactId || options.leadId)) {
      await this.logCommunication({
        templateId: options.templateId,
        subject:    options.subject ?? options.params?.subject ?? `Template #${options.templateId}`,
        contactId:  options.contactId,
        leadId:     options.leadId,
        createdBy:  options.createdBy,
        messageId,
      })
    }

    return messageId
  }

  // ── Custom HTML email (free-form, no template) ──────────────────────────────

  async sendEmail(options: SendEmailOptions) {
    return this.brevoRequest('/smtp/email', 'POST', {
      sender: {
        name:  options.senderName  ?? process.env.BREVO_SENDER_NAME  ?? 'CRM',
        email: options.senderEmail ?? process.env.BREVO_SENDER_EMAIL,
      },
      to:          options.to,
      subject:     options.subject,
      htmlContent: options.htmlContent,
      replyTo:     options.replyTo ? { email: options.replyTo } : undefined,
      tags:        options.tags,
    })
  }

  // ── Domain triggers ─────────────────────────────────────────────────────────

  /** Notify assignee when a new lead is created and assigned to them. */
  async sendLeadAssigned(payload: {
    assigneeId:   string
    leadId:       string
    leadTitle:    string
    contactName?: string
    leadValue?:   number
    createdById:  string
  }): Promise<void> {
    const assignee = await this.getProfileEmail(payload.assigneeId)
    if (!assignee) return

    await this.sendTransactional({
      to:         { email: assignee.email, name: assignee.name },
      templateId: BREVO_TEMPLATES.LEAD_ASSIGNED,
      params: {
        ASSIGNEE_NAME: assignee.name,
        LEAD_TITLE:    payload.leadTitle,
        CONTACT_NAME:  payload.contactName ?? '—',
        LEAD_VALUE:    payload.leadValue ? `${payload.leadValue} €` : '—',
        CRM_URL:       `${process.env.FRONTEND_URL}/leads/${payload.leadId}`,
      },
      leadId:    payload.leadId,
      createdBy: payload.createdById,
      subject:   `Nouveau lead assigné : ${payload.leadTitle}`,
    })
  }

  /** Notify assignee when their deal moves to a significant pipeline stage. */
  async sendDealStageChanged(payload: {
    assigneeId:  string
    leadId:      string
    leadTitle:   string
    oldStage:    string
    newStage:    string
    createdById: string
  }): Promise<void> {
    const assignee = await this.getProfileEmail(payload.assigneeId)
    if (!assignee) return

    const notifyStages = ['qualifié', 'proposition', 'négociation', 'gagné', 'perdu']
    if (!notifyStages.includes(payload.newStage)) return

    const templateId = payload.newStage === 'gagné'
      ? BREVO_TEMPLATES.LEAD_WON
      : payload.newStage === 'perdu'
        ? BREVO_TEMPLATES.LEAD_LOST
        : BREVO_TEMPLATES.DEAL_STAGE_CHANGED

    await this.sendTransactional({
      to:         { email: assignee.email, name: assignee.name },
      templateId,
      params: {
        ASSIGNEE_NAME: assignee.name,
        LEAD_TITLE:    payload.leadTitle,
        OLD_STAGE:     payload.oldStage,
        NEW_STAGE:     payload.newStage,
        CRM_URL:       `${process.env.FRONTEND_URL}/leads/${payload.leadId}`,
      },
      leadId:    payload.leadId,
      createdBy: payload.createdById,
      subject:   `Pipeline : ${payload.leadTitle} → ${payload.newStage}`,
    })
  }

  /** Notify assignee when a task is assigned to them. */
  async sendTaskAssigned(payload: {
    assigneeId:   string
    taskId:       string
    taskTitle:    string
    priority:     string
    dueDate?:     string
    contactName?: string
    createdById:  string
  }): Promise<void> {
    const assignee = await this.getProfileEmail(payload.assigneeId)
    if (!assignee) return

    const dueDateFormatted = payload.dueDate
      ? new Date(payload.dueDate).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        })
      : '—'

    await this.sendTransactional({
      to:         { email: assignee.email, name: assignee.name },
      templateId: BREVO_TEMPLATES.TASK_ASSIGNED,
      params: {
        ASSIGNEE_NAME: assignee.name,
        TASK_TITLE:    payload.taskTitle,
        PRIORITY:      payload.priority,
        DUE_DATE:      dueDateFormatted,
        CONTACT_NAME:  payload.contactName ?? '—',
        CRM_URL:       `${process.env.FRONTEND_URL}/tasks`,
      },
      createdBy: payload.createdById,
      subject:   `Nouvelle tâche assignée : ${payload.taskTitle}`,
    })
  }

  /** Send a welcome email to a newly invited user. */
  async sendWelcomeInvitation(payload: {
    recipientEmail: string
    recipientName:  string
    role:           string
    loginUrl:       string
  }): Promise<void> {
    await this.sendTransactional({
      to:         { email: payload.recipientEmail, name: payload.recipientName },
      templateId: BREVO_TEMPLATES.WELCOME,
      params: {
        FULL_NAME: payload.recipientName,
        ROLE:      payload.role,
        LOGIN_URL: payload.loginUrl,
      },
    })
  }

  /** @deprecated Use sendLeadAssigned() instead. Kept for backward compatibility. */
  async sendLeadWelcomeEmail(params: {
    contactEmail:   string
    contactName:    string
    leadTitle:      string
    commercialName: string
    contactId:      string
    leadId:         string
    createdBy:      string
  }) {
    return this.sendTransactional({
      to:         { email: params.contactEmail, name: params.contactName },
      templateId: BREVO_TEMPLATES.LEAD_ASSIGNED,
      params: {
        CONTACT_NAME:    params.contactName,
        LEAD_TITLE:      params.leadTitle,
        COMMERCIAL_NAME: params.commercialName,
      },
      contactId: params.contactId,
      leadId:    params.leadId,
      createdBy: params.createdBy,
    })
  }

  /** @deprecated Use sendLeadAssigned() instead. Kept for backward compatibility. */
  async sendFollowUpEmail(params: {
    contactEmail:  string
    contactName:   string
    leadTitle:     string
    daysInactive:  number
    contactId:     string
    leadId:        string
    createdBy:     string
  }) {
    return this.sendTransactional({
      to:         { email: params.contactEmail, name: params.contactName },
      templateId: BREVO_TEMPLATES.LEAD_STATUS_CHANGED,
      params: {
        CONTACT_NAME:  params.contactName,
        LEAD_TITLE:    params.leadTitle,
        DAYS_INACTIVE: params.daysInactive,
      },
      contactId: params.contactId,
      leadId:    params.leadId,
      createdBy: params.createdBy,
    })
  }

  // ── Campaigns ───────────────────────────────────────────────────────────────

  async createCampaign(data: {
    name:        string
    subject:     string
    htmlContent: string
    scheduledAt?: Date
    listIds:     number[]
    createdBy:   string
  }) {
    const brevoPayload: any = {
      name:        data.name,
      subject:     data.subject,
      sender:      {
        name:  process.env.BREVO_SENDER_NAME  ?? 'CRM',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      type:        'classic',
      htmlContent: data.htmlContent,
      recipients:  { listIds: data.listIds },
    }

    if (data.scheduledAt) {
      brevoPayload.scheduledAt = data.scheduledAt.toISOString()
    }

    const result = await this.brevoRequest('/emailCampaigns', 'POST', brevoPayload)

    const [campaign] = await db.insert(emailCampaigns).values({
      name:              data.name,
      subject:           data.subject,
      brevo_campaign_id: result.id,
      status:            data.scheduledAt ? 'planifiée' : 'brouillon',
      scheduled_at:      data.scheduledAt,
      created_by:        data.createdBy,
    }).returning()

    return campaign
  }

  async syncCampaignStats(campaignId: string) {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)

    if (!campaign?.brevo_campaign_id) return null

    const stats      = await this.brevoRequest(`/emailCampaigns/${campaign.brevo_campaign_id}`, 'GET')
    const statistics = stats.statistics?.campaignStats?.[0]

    const [updated] = await db
      .update(emailCampaigns)
      .set({
        sent_count: statistics?.delivered ?? 0,
        open_rate:  statistics?.uniqueOpens && statistics?.delivered
          ? (statistics.uniqueOpens / statistics.delivered * 100).toFixed(2)
          : null,
        click_rate: statistics?.uniqueClicks && statistics?.delivered
          ? (statistics.uniqueClicks / statistics.delivered * 100).toFixed(2)
          : null,
        status:     stats.status === 'sent' ? 'envoyée' : campaign.status,
        sent_at:    stats.sentDate ? new Date(stats.sentDate) : null,
        updated_at: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId))
      .returning()

    return updated
  }

  /** Fetch live stats for a campaign — used by CommunicationsService.syncCampaignStats() */
  async getCampaignStats(brevoCampaignId: number): Promise<{
    sentCount:  number
    openRate:   number
    clickRate:  number
    unsubscribeCount: number
    bounceCount:      number
  } | null> {
    try {
      const stats = await this.brevoRequest(`/emailCampaigns/${brevoCampaignId}`, 'GET')
      const s     = stats.statistics?.globalStats ?? stats.statistics?.campaignStats?.[0]
      if (!s) return null

      const sent   = Number(s.sent ?? s.delivered ?? 0)
      const opens  = Number(s.uniqueOpens  ?? 0)
      const clicks = Number(s.uniqueClicks ?? 0)
      const unsubscribes = Number(s.unsubscriptions ?? s.unsubscribes ?? 0)
      const bounces      = Number(s.hardBounces ?? 0) + Number(s.softBounces ?? 0)

      return {
        sentCount:  sent,
        openRate:   sent > 0 ? Math.round((opens  / sent) * 10000) / 100 : 0,
        clickRate:  sent > 0 ? Math.round((clicks / sent) * 10000) / 100 : 0,
        unsubscribeCount: unsubscribes,
        bounceCount:      bounces,
      }
    } catch (err: any) {
      this.logger.error(`getCampaignStats(${brevoCampaignId}): ${err?.message}`)
      return null
    }
  }

  // ── Contacts / Lists ────────────────────────────────────────────────────────

  async addContactToList(email: string, firstName: string, lastName: string, listId: number) {
    try {
      await this.brevoRequest('/contacts', 'POST', {
        email,
        attributes:    { FIRSTNAME: firstName, LASTNAME: lastName },
        listIds:       [listId],
        updateEnabled: true,
      })
    } catch {
      this.logger.warn(`Could not add ${email} to Brevo list ${listId}`)
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Resolve a profile's email + display name via Supabase admin API. */
  private async getProfileEmail(profileId: string): Promise<{ email: string; name: string } | null> {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } },
      )

      const { data: userData, error } = await adminClient.auth.admin.getUserById(profileId)
      if (error || !userData?.user?.email) {
        this.logger.warn(`Could not retrieve email for profileId=${profileId}: ${error?.message}`)
        return null
      }

      const [profile] = await db
        .select({ full_name: profiles.full_name })
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1)

      return {
        email: userData.user.email,
        name:  profile?.full_name ?? userData.user.email,
      }
    } catch (err: any) {
      this.logger.error(`getProfileEmail error: ${err?.message}`)
      return null
    }
  }

  /** Persist an email send event in the communications table. */
  private async logCommunication(data: {
    templateId: number
    subject:    string
    contactId?: string
    leadId?:    string
    createdBy:  string
    messageId:  string
  }): Promise<void> {
    try {
      await db.insert(communications).values({
        type:             'email',
        subject:          data.subject,
        body:             `Template #${data.templateId}`,
        direction:        'sortant',
        occurred_at:      new Date(),
        contact_id:       data.contactId ?? null,
        lead_id:          data.leadId    ?? null,
        brevo_message_id: data.messageId || null,
        created_by:       data.createdBy,
      })
    } catch (err: any) {
      this.logger.error(`logCommunication error: ${err?.message}`)
    }
  }

  // Calcul et persistance du ROI 
  async calculateAndSaveRoi(campaignId: string): Promise<{
    cost: number
    revenue: number
    roi: number | null
  }> {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)

    if (!campaign) throw new NotFoundException('Campagne introuvable')

    const cost    = Number(campaign.cost    ?? 0)
    const revenue = Number(campaign.revenue_generated ?? 0)

    // ROI = (Gain net / Coût) × 100
    // Exemple : coût 500€, revenus 2000€ → ROI = (1500/500)*100 = 300%
    const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null

    await db
      .update(emailCampaigns)
      .set({ roi: roi !== null ? String(roi.toFixed(2)) : null })
      .where(eq(emailCampaigns.id, campaignId))

    return { cost, revenue, roi }
  }

  // Mise à jour des données financières + recalcul ROI
  async updateFinancials(campaignId: string, data: {
    cost?:              number
    revenue_generated?: number
    conversion_count?:  number
  }): Promise<void> {
    await db
      .update(emailCampaigns)
      .set({
        ...(data.cost              !== undefined && { cost: String(data.cost) }),
        ...(data.revenue_generated !== undefined && { revenue_generated: String(data.revenue_generated) }),
        ...(data.conversion_count  !== undefined && { conversion_count: data.conversion_count }),
        updated_at: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId))

    // Recalcule immédiatement après la mise à jour
    await this.calculateAndSaveRoi(campaignId)
  }
}
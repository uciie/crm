// ============================================================
// email/email.service.ts  —  Resend
// ============================================================

import {
  Injectable, Logger, OnModuleInit, NotFoundException,
} from '@nestjs/common'
import { Resend }       from 'resend'
import { db }           from '../database/db.config'
import { emailCampaigns, communications, profiles } from '../database/schema'
import { eq }           from 'drizzle-orm'
import { TEMPLATES, validateTemplates, type TemplateName, type TemplatePayload } from './templates.config'

// ── Types ──────────────────────────────────────────────────────

export interface EmailRecipient { email: string; name?: string }

export interface TransactionalEmailOptions {
  to:          EmailRecipient | EmailRecipient[]
  template:    TemplateName
  // params est Record<string, any> — chaque template documente ses propres clés
  params:      Record<string, any>
  contactId?:  string
  leadId?:     string
  createdBy?:  string
}

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name)
  private resend!: Resend

  private get senderFrom(): string {
    const name  = process.env.RESEND_SENDER_NAME  ?? 'CRM'
    const email = process.env.RESEND_SENDER_EMAIL ?? ''
    return `${name} <${email}>`
  }

  onModuleInit() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY manquant — envoi désactivé.')
      return
    }
    this.resend = new Resend(apiKey)
    validateTemplates()
    this.logger.log('EmailService (Resend) initialisé ✔')
  }

  // ── Core sender ─────────────────────────────────────────────

  async sendTransactional(options: TransactionalEmailOptions): Promise<string | null> {
    if (!this.resend) {
      this.logger.warn('Resend non initialisé — envoi ignoré.')
      return null
    }

    const renderer = TEMPLATES[options.template]
    if (!renderer) {
      this.logger.error(`Template inconnu : ${options.template}`)
      return null
    }

    // renderer est désormais (params: any) => TemplatePayload — aucune erreur TS
    const { subject, html }: TemplatePayload = renderer(options.params)
    const toArray = Array.isArray(options.to) ? options.to : [options.to]

    let messageId: string | null = null

    try {
      const { data, error } = await this.resend.emails.send({
        from:    this.senderFrom,
        to:      toArray.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
        subject,
        html,
        replyTo: process.env.RESEND_REPLY_TO,
      })

      if (error) {
        this.logger.error(`Resend error: ${JSON.stringify(error)}`)
        return null
      }

      messageId = data?.id ?? null
      this.logger.debug(
        `Email envoyé — template=${options.template} id=${messageId}`
      )
    } catch (err: any) {
      this.logger.error(`sendTransactional failed: ${err?.message}`)
      return null
    }

    if (options.createdBy && (options.contactId || options.leadId) && messageId) {
      await this.logCommunication({
        template:  options.template,
        subject,
        contactId: options.contactId,
        leadId:    options.leadId,
        createdBy: options.createdBy,
        messageId,
      })
    }

    return messageId
  }

  // ── Domain triggers ─────────────────────────────────────────

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
      to:       assignee,
      template: 'LEAD_ASSIGNED',
      params: {
        assignee_name: assignee.name,
        lead_title:    payload.leadTitle,
        contact_name:  payload.contactName ?? '—',
        lead_value:    payload.leadValue ? `${payload.leadValue} €` : '—',
        crm_url:       `${process.env.FRONTEND_URL}/leads/${payload.leadId}`,
      },
      leadId:    payload.leadId,
      createdBy: payload.createdById,
    })
  }

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

    const template: TemplateName =
      payload.newStage === 'gagné' ? 'LEAD_WON'
      : payload.newStage === 'perdu' ? 'LEAD_LOST'
      : 'DEAL_STAGE_CHANGED'

    await this.sendTransactional({
      to:       assignee,
      template,
      params: {
        assignee_name: assignee.name,
        lead_title:    payload.leadTitle,
        old_stage:     payload.oldStage,
        new_stage:     payload.newStage,
        crm_url:       `${process.env.FRONTEND_URL}/leads/${payload.leadId}`,
      },
      leadId:    payload.leadId,
      createdBy: payload.createdById,
    })
  }

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
      to:       assignee,
      template: 'TASK_ASSIGNED',
      params: {
        assignee_name: assignee.name,
        task_title:    payload.taskTitle,
        priority:      payload.priority,
        due_date:      dueDateFormatted,
        contact_name:  payload.contactName ?? '—',
        crm_url:       `${process.env.FRONTEND_URL}/tasks`,
      },
      createdBy: payload.createdById,
    })
  }

  async sendWelcomeInvitation(payload: {
    recipientEmail: string
    recipientName:  string
    role:           string
    loginUrl:       string
  }): Promise<void> {
    await this.sendTransactional({
      to:       { email: payload.recipientEmail, name: payload.recipientName },
      template: 'WELCOME',
      params: {
        full_name: payload.recipientName,
        role:      payload.role,
        login_url: payload.loginUrl,
      },
    })
  }

  // ── Campaigns ───────────────────────────────────────────────

  async createCampaign(data: {
    name:         string
    subject:      string
    htmlContent:  string
    scheduledAt?: Date
    listIds:      number[]
    createdBy:    string
  }) {
    // Resend n'a pas d'API campaigns — on stocke en DB avec statut "brouillon"
    const [campaign] = await db
      .insert(emailCampaigns)
      .values({
        name:         data.name,
        subject:      data.subject,
        status:       data.scheduledAt ? 'planifiée' : 'brouillon',
        scheduled_at: data.scheduledAt,
        created_by:   data.createdBy,
      })
      .returning()
    return campaign
  }

  async syncCampaignStats(campaignId: string) {
    // Non applicable avec Resend — retourne les données DB telles quelles
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)
    return campaign ?? null
  }

  async getCampaignStats(_brevoCampaignId: number) {
    // Conservé pour compatibilité avec CommunicationsService
    return null
  }

  async addContactToList(
    _email:     string,
    _firstName: string,
    _lastName:  string,
    _listId:    number,
  ) {
    this.logger.warn('addContactToList: non applicable avec Resend.')
  }

  async calculateAndSaveRoi(campaignId: string): Promise<{
    cost:    number
    revenue: number
    roi:     number | null
  }> {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)

    if (!campaign) throw new NotFoundException('Campagne introuvable')

    const cost    = Number(campaign.cost             ?? 0)
    const revenue = Number(campaign.revenue_generated ?? 0)
    const roi     = cost > 0 ? ((revenue - cost) / cost) * 100 : null

    await db
      .update(emailCampaigns)
      .set({ roi: roi !== null ? String(roi.toFixed(2)) : null })
      .where(eq(emailCampaigns.id, campaignId))

    return { cost, revenue, roi }
  }

  async updateFinancials(
    campaignId: string,
    data: {
      cost?:              number
      revenue_generated?: number
      conversion_count?:  number
    },
  ): Promise<void> {
    await db
      .update(emailCampaigns)
      .set({
        ...(data.cost              !== undefined && { cost:              String(data.cost) }),
        ...(data.revenue_generated !== undefined && { revenue_generated: String(data.revenue_generated) }),
        ...(data.conversion_count  !== undefined && { conversion_count:  data.conversion_count }),
        updated_at: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId))

    await this.calculateAndSaveRoi(campaignId)
  }

  // ── Private helpers ─────────────────────────────────────────

  private async getProfileEmail(
    profileId: string,
  ): Promise<{ email: string; name: string } | null> {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } },
      )

      const { data: userData, error } = await adminClient.auth.admin.getUserById(profileId)
      if (error || !userData?.user?.email) {
        this.logger.warn(
          `Impossible de récupérer l'email pour profileId=${profileId}: ${error?.message}`
        )
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
      this.logger.error(`getProfileEmail: ${err?.message}`)
      return null
    }
  }

  private async logCommunication(data: {
    template:   string
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
        body:             `Template: ${data.template}`,
        direction:        'sortant',
        occurred_at:      new Date(),
        contact_id:       data.contactId ?? null,
        lead_id:          data.leadId    ?? null,
        brevo_message_id: data.messageId || null, // colonne réutilisée pour l'ID Resend
        created_by:       data.createdBy,
      })
    } catch (err: any) {
      this.logger.error(`logCommunication: ${err?.message}`)
    }
  }
}
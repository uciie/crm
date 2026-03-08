// ============================================================
// email/email.service.ts  —  Resend (SDK officiel)
// ============================================================

import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common'
import { Resend } from 'resend'
import { db } from '../database/db.config'
import { emailCampaigns, communications, profiles } from '../database/schema'
import { eq } from 'drizzle-orm'
import {
  TEMPLATES,
  validateTemplates,
  type TemplateName,
  type TemplatePayload,
} from './templates.config'

export interface EmailRecipient {
  email: string
  name?: string
}

export interface TransactionalEmailOptions {
  to:          EmailRecipient | EmailRecipient[]
  template:    TemplateName
  params:      Record<string, any>
  contactId?:  string
  leadId?:     string
  createdBy?:  string
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name)
  private resend: Resend | null = null

  // ── "CRM <onboarding@resend.dev>" ─────────────────────────
  private get senderFrom(): string {
    const name  = process.env.RESEND_SENDER_NAME  ?? 'CRM'
    const email = process.env.RESEND_SENDER_EMAIL ?? ''
    if (!email) {
      this.logger.error('RESEND_SENDER_EMAIL manquant dans les variables d\'environnement !')
    }
    return `${name} <${email}>`
  }

  onModuleInit() {
    const apiKey = process.env.RESEND_API_KEY

    // Log détaillé pour Vercel Runtime Logs
    this.logger.log(`=== EmailService init ===`)
    this.logger.log(`RESEND_API_KEY présente ? ${!!apiKey} (préfixe: ${apiKey?.substring(0, 6) ?? 'N/A'})`)
    this.logger.log(`RESEND_SENDER_EMAIL: ${process.env.RESEND_SENDER_EMAIL ?? '⚠️ MANQUANT'}`)
    this.logger.log(`RESEND_SENDER_NAME:  ${process.env.RESEND_SENDER_NAME  ?? '⚠️ MANQUANT'}`)

    if (!apiKey) {
      this.logger.error('❌ RESEND_API_KEY manquante — les emails sont DÉSACTIVÉS.')
      return
    }

    this.resend = new Resend(apiKey)
    validateTemplates()
    this.logger.log('✅ EmailService (Resend SDK) initialisé avec succès')
  }

  // ── Envoi principal ────────────────────────────────────────

  async sendTransactional(options: TransactionalEmailOptions): Promise<string | null> {
    // Garde-fou : SDK non initialisé
    if (!this.resend) {
      this.logger.error('❌ sendTransactional: Resend non initialisé (RESEND_API_KEY absente ?)')
      return null
    }

    // Résolution du template
    const renderer = TEMPLATES[options.template]
    if (!renderer) {
      this.logger.error(`❌ Template inconnu : "${options.template}"`)
      return null
    }

    const { subject, html }: TemplatePayload = renderer(options.params)
    const toArray = Array.isArray(options.to) ? options.to : [options.to]
    const toFormatted = toArray.map(r => (r.name ? `${r.name} <${r.email}>` : r.email))

    this.logger.log(`📧 Envoi email — template="${options.template}" to="${toFormatted.join(', ')}" from="${this.senderFrom}"`)

    let messageId: string | null = null

    try {
      // ── Appel SDK Resend officiel ──────────────────────────
      const { data, error } = await this.resend.emails.send({
        from:     this.senderFrom,
        to:       toFormatted,
        subject,
        html,
        replyTo:  process.env.RESEND_REPLY_TO,
      })

      // Resend retourne { data: null, error: {...} } en cas d'échec
      // (pas d'exception levée — il faut vérifier `error` explicitement)
      if (error) {
        // Log COMPLET de l'objet error pour Vercel Runtime Logs
        this.logger.error(
          `❌ Resend API error — template="${options.template}"\n` +
          `   name:    ${(error as any).name ?? 'N/A'}\n` +
          `   message: ${(error as any).message ?? JSON.stringify(error)}\n` +
          `   statusCode: ${(error as any).statusCode ?? 'N/A'}\n` +
          `   from:    ${this.senderFrom}\n` +
          `   to:      ${toFormatted.join(', ')}`
        )

        // Conseils ciblés selon le code d'erreur
        const statusCode = (error as any).statusCode
        if (statusCode === 403) {
          this.logger.error('   💡 403 = domaine expéditeur non vérifié dans le dashboard Resend, OU clé API sans permission "emails:send"')
        } else if (statusCode === 422) {
          this.logger.error('   💡 422 = adresse "from" invalide ou domaine non vérifié. Vérifiez RESEND_SENDER_EMAIL.')
        } else if (statusCode === 401) {
          this.logger.error('   💡 401 = RESEND_API_KEY invalide ou révoquée.')
        }

        return null
      }

      messageId = data?.id ?? null
      this.logger.log(`✅ Email envoyé — id="${messageId}" template="${options.template}"`)

    } catch (err: any) {
      // Exception réseau ou autre erreur non gérée par le SDK
      this.logger.error(
        `❌ sendTransactional exception — template="${options.template}"\n` +
        `   message: ${err?.message}\n` +
        `   stack:   ${err?.stack}`
      )
      return null
    }

    // Log en base si les IDs sont fournis
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

  // ── Déclencheurs métier ────────────────────────────────────

  async sendWelcomeInvitation(payload: {
    recipientEmail: string
    recipientName:  string
    role:           string
    loginUrl:       string
  }): Promise<void> {
    this.logger.log(`📧 sendWelcomeInvitation → ${payload.recipientEmail}`)

    await this.sendTransactional({
      to: { email: payload.recipientEmail, name: payload.recipientName },
      template: 'WELCOME',
      params: {
        full_name: payload.recipientName,
        role:      payload.role,
        login_url: payload.loginUrl,
      },
    })
  }

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

  // ── Campaigns ──────────────────────────────────────────────

  async createCampaign(data: {
    name:         string
    subject:      string
    htmlContent:  string
    scheduledAt?: Date
    listIds:      number[]
    createdBy:    string
  }) {
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
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)
    return campaign ?? null
  }

  async getCampaignStats(_brevoCampaignId: number) {
    return null
  }

  async addContactToList(
    _email: string, _firstName: string, _lastName: string, _listId: number,
  ) {
    this.logger.warn('addContactToList: non applicable avec Resend.')
  }

  async calculateAndSaveRoi(campaignId: string) {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)

    if (!campaign) throw new NotFoundException('Campagne introuvable')

    const cost    = Number(campaign.cost              ?? 0)
    const revenue = Number(campaign.revenue_generated ?? 0)
    const roi     = cost > 0 ? ((revenue - cost) / cost) * 100 : null

    await db
      .update(emailCampaigns)
      .set({ roi: roi !== null ? String(roi.toFixed(2)) : null })
      .where(eq(emailCampaigns.id, campaignId))

    return { cost, revenue, roi }
  }

  async updateFinancials(campaignId: string, data: {
    cost?: number; revenue_generated?: number; conversion_count?: number
  }): Promise<void> {
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

  // ── Helpers privés ─────────────────────────────────────────

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
        this.logger.warn(`Impossible de récupérer l'email pour profileId=${profileId}: ${error?.message}`)
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
    template: string; subject: string; contactId?: string;
    leadId?: string; createdBy: string; messageId: string
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
        brevo_message_id: data.messageId,
        created_by:       data.createdBy,
      })
    } catch (err: any) {
      this.logger.error(`logCommunication: ${err?.message}`)
    }
  }
}
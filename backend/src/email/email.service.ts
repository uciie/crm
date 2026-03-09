// ============================================================
// email/email.service.ts
// Transactionnel : Resend
// Campagnes      : Brevo (nouvelle API @getbrevo/brevo v3)
// ============================================================

import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common'
import { Resend }                from 'resend'
import { BrevoClient, Brevo }    from '@getbrevo/brevo'   // ← nouvelle API
import { db }                    from '../database/db.config'
import { emailCampaigns, communications, profiles } from '../database/schema'
import { eq }                    from 'drizzle-orm'
import {
  TEMPLATES,
  validateTemplates,
  type TemplateName,
  type TemplatePayload,
} from './templates.config'
import * as nodemailer from 'nodemailer'

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
  private smtpTransport: nodemailer.Transporter | null = null
  private resend:      Resend      | null = null
  private brevo:       BrevoClient | null = null   // ← un seul client unifié

  private get senderFrom(): string {
    const name  = process.env.BREVO_SENDER_NAME  ?? 'CRM'
    const email = process.env.BREVO_SENDER_EMAIL ?? ''
    if (!email) this.logger.error('BREVO_SENDER_EMAIL manquant !')
    return `${name} <${email}>`
  }

  // ── Init ───────────────────────────────────────────────────

  onModuleInit() {
    this.logger.log('=== EmailService init ===')
    this.logger.log(`BREVO_API_KEY présente ? ${!!process.env.BREVO_API_KEY}`)  // ← ajoutez ça
    this.logger.log(`BREVO_SENDER_ID: ${process.env.BREVO_SENDER_ID ?? '⚠️ MANQUANT'}`)
    this.logger.log(`BREVO_WELCOME_TEMPLATE_ID: ${process.env.BREVO_WELCOME_TEMPLATE_ID ?? '⚠️ MANQUANT'}`)

    // Resend
    const resendKey = process.env.RESEND_API_KEY
    this.logger.log(`RESEND_API_KEY présente ? ${!!resendKey} (préfixe: ${resendKey?.substring(0, 6) ?? 'N/A'})`)
    if (!resendKey) {
      this.logger.error('❌ RESEND_API_KEY manquante — emails transactionnels DÉSACTIVÉS.')
    } else {
      this.resend = new Resend(resendKey)
      validateTemplates()
      this.logger.log('✅ Resend initialisé')
    }

    // Brevo — nouvelle API : un seul BrevoClient
    const brevoKey = process.env.BREVO_API_KEY
    this.logger.log(`BREVO_API_KEY présente ? ${!!brevoKey}`)
    if (!brevoKey) {
      this.logger.error('❌ BREVO_API_KEY manquante — campagnes DÉSACTIVÉES.')
    } else {
      this.brevo = new BrevoClient({ apiKey: brevoKey })
      this.logger.log('✅ Brevo initialisé')
    }

    const smtpPass = process.env.BREVO_SMTP_PASS
    if (smtpPass) {
      this.smtpTransport = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST ?? 'smtp-relay.brevo.com',
        port: Number(process.env.BREVO_SMTP_PORT ?? 587),
        auth: {
          user: process.env.BREVO_SMTP_USER,
          pass: smtpPass,
        },
      })
      console.log('SMTP config:', {
        host: process.env.BREVO_SMTP_HOST,
        port: process.env.BREVO_SMTP_PORT,
        user: process.env.BREVO_SMTP_USER,
        pass: smtpPass ? '***' : 'MISSING',
      })
      this.logger.log('✅ SMTP Brevo initialisé')
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RESEND — Emails transactionnels
  // ═══════════════════════════════════════════════════════════

  async sendTransactional(options: TransactionalEmailOptions): Promise<string | null> {
    if (!this.resend) {
      this.logger.error('❌ sendTransactional: Resend non initialisé')
      return null
    }

    const renderer = TEMPLATES[options.template]
    if (!renderer) {
      this.logger.error(`❌ Template inconnu : "${options.template}"`)
      return null
    }

    const { subject, html }: TemplatePayload = renderer(options.params)
    const toArray     = Array.isArray(options.to) ? options.to : [options.to]
    const toFormatted = toArray.map(r => (r.name ? `${r.name} <${r.email}>` : r.email))

    this.logger.log(`📧 Envoi — template="${options.template}" to="${toFormatted.join(', ')} from "${this.senderFrom}"`)

    let messageId: string | null = null

    try {
      const { data, error } = await this.resend.emails.send({
        from:    this.senderFrom,
        to:      toFormatted,
        subject,
        html,
        replyTo: process.env.RESEND_REPLY_TO,
      })

      if (error) {
        const statusCode = (error as any).statusCode
        this.logger.error(
          `❌ Brevo error — template="${options.template}"\n` +
          `   name:       ${(error as any).name ?? 'N/A'}\n` +
          `   message:    ${(error as any).message ?? JSON.stringify(error)}\n` +
          `   statusCode: ${statusCode ?? 'N/A'}`
        )
        if (statusCode === 403) this.logger.error('   💡 403 = domaine non vérifié')
        if (statusCode === 422) this.logger.error('   💡 422 = adresse "from" invalide')
        if (statusCode === 401) this.logger.error('   💡 401 = BREVO_API_KEY invalide')
        return null
      }

      messageId = data?.id ?? null
      this.logger.log(`✅ Email envoyé — id="${messageId}"`)

    } catch (err: any) {
      this.logger.error(`❌ sendTransactional exception: ${err?.message}`)
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

  // ── Déclencheurs métier ────────────────────────────────────

  async sendWelcomeInvitation(payload: {
    recipientEmail: string
    recipientName:  string
    role:           string
    loginUrl:       string
  }): Promise<void> {
    this.logger.log(`📧 sendWelcomeInvitation → ${payload.recipientEmail}`)
    this.logger.log(`   brevo initialisé ? ${!!this.brevo}`)           // ← ajout
    this.logger.log(`   BREVO_SENDER_ID: ${process.env.BREVO_SENDER_ID}`)    // ← ajout
    this.logger.log(`   BREVO_WELCOME_TEMPLATE_ID: ${process.env.BREVO_WELCOME_TEMPLATE_ID}`) // ← ajout

    if (this.brevo) {
      try {
        this.logger.log(`   → Tentative envoi Brevo transactionnel...`)  // ← ajout
        await this.brevo.transactionalEmails.sendTransacEmail({
          to: [{ email: payload.recipientEmail, name: payload.recipientName }],
          sender: { id: Number(process.env.BREVO_SENDER_ID) },
          templateId: Number(process.env.BREVO_WELCOME_TEMPLATE_ID ?? 9),
          params: {
            FULL_NAME: payload.recipientName,
            ROLE:      payload.role,
            LOGIN_URL: payload.loginUrl,
          },
        })
        this.logger.log(`✅ Email de bienvenue envoyé via Brevo → ${payload.recipientEmail}`)
        return
      } catch (err: any) {
        // Log COMPLET de l'erreur Brevo
        this.logger.error(`❌ Brevo sendWelcomeInvitation FAILED`)
        this.logger.error(`   message:    ${err?.message}`)
        this.logger.error(`   statusCode: ${err?.statusCode ?? err?.status ?? 'N/A'}`)
        this.logger.error(`   body:       ${JSON.stringify(err?.body ?? err?.response ?? err)}`)
      }
    } else {
      this.logger.warn('⚠️ Brevo non initialisé — fallback Resend')
    }

    // Fallback Resend
    this.logger.log('   → Fallback Resend...')
    const resendResult = await this.sendTransactional({
      to:       { email: payload.recipientEmail, name: payload.recipientName },
      template: 'WELCOME',
      params: {
        full_name: payload.recipientName,
        role:      payload.role,
        login_url: payload.loginUrl,
      },
    })

    if (resendResult) return

    // Fallback SMTP Brevo
    if (this.smtpTransport) {
      this.logger.log('   → Fallback SMTP Brevo...')
      try {
        const renderer = TEMPLATES['WELCOME']
        const { subject, html } = renderer({
          full_name: payload.recipientName,
          role:      payload.role,
          login_url: payload.loginUrl,
        })
        await this.smtpTransport.sendMail({
          from:    this.senderFrom,
          to:      `${payload.recipientName} <${payload.recipientEmail}>`,
          subject,
          html,
        })
        this.logger.log(`✅ Email de bienvenue envoyé via SMTP Brevo → ${payload.recipientEmail}`)
      } catch (err: any) {
        this.logger.error(`❌ SMTP Brevo sendWelcomeInvitation FAILED: ${err?.message}`)
      }
    } else {
      this.logger.error('❌ Aucun transport disponible (Brevo API, Resend, SMTP) — email non envoyé')
    }
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

  // ═══════════════════════════════════════════════════════════
  // BREVO — Contacts
  // ═══════════════════════════════════════════════════════════

  async addContactToList(
    email:     string,
    firstName: string,
    lastName:  string,
    listId:    number,
  ): Promise<void> {
    if (!this.brevo) {
      this.logger.warn('addContactToList: Brevo non initialisé')
      return
    }
    try {
      await this.brevo.contacts.createContact({
        email,
        attributes:   { FIRSTNAME: firstName, LASTNAME: lastName },
        listIds:      [listId],
        updateEnabled: true,
      })
      this.logger.log(`✅ Contact ${email} ajouté à la liste Brevo ${listId}`)
    } catch (err: any) {
      this.logger.error(`❌ addContactToList: ${err?.message}`)
    }
  }

  async unsubscribeContact(email: string): Promise<void> {
    if (!this.brevo) {
      this.logger.warn('unsubscribeContact: Brevo non initialisé')
      return
    }
    try {
      await this.brevo.contacts.updateContact({
        identifier:       email,
        identifierType:   'email_id',  // string littéral, pas d'enum nécessaire
        emailBlacklisted: true,        // dans le même objet
      })
      this.logger.log(`✅ Contact ${email} désabonné dans Brevo`)
    } catch (err: any) {
      this.logger.error(`❌ unsubscribeContact: ${err?.message}`)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // BREVO — Campagnes
  // ═══════════════════════════════════════════════════════════

  async createCampaign(data: {
    name:         string
    subject:      string
    htmlContent:  string
    listIds:      number[]
    scheduledAt?: Date
    createdBy:    string
  }) {
    let brevoCampaignId: number | undefined

    if (this.brevo) {
      try {
        const result = await this.brevo.emailCampaigns.createEmailCampaign({
          name:        data.name,
          subject:     data.subject,
          sender: {
            name:  process.env.BREVO_SENDER_NAME  ?? 'CRM',
            email: process.env.BREVO_SENDER_EMAIL ?? '',
          },
          htmlContent:  data.htmlContent,
          recipients:   { listIds: data.listIds },
          scheduledAt:  data.scheduledAt?.toISOString(),
        })
        brevoCampaignId = result.id
        this.logger.log(`✅ Campagne Brevo créée — id=${brevoCampaignId}`)
      } catch (err: any) {
        this.logger.error(`❌ createCampaign Brevo: ${err?.message}`)
      }
    }

    const [saved] = await db
      .insert(emailCampaigns)
      .values({
        name:              data.name,
        subject:           data.subject,
        brevo_campaign_id: brevoCampaignId,
        status:            data.scheduledAt ? 'planifiée' : 'brouillon',
        scheduled_at:      data.scheduledAt,
        created_by:        data.createdBy,
      })
      .returning()

    return saved
  }

  async syncCampaignStats(campaignId: string) {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)

    if (!campaign) return null

    if (campaign.brevo_campaign_id && this.brevo) {
      try {
        const result = await this.brevo.emailCampaigns.getEmailCampaign({
          campaignId: campaign.brevo_campaign_id,  // ← objet { campaignId }
        })
        const stats = (result as any).statistics?.globalStats

        await db
          .update(emailCampaigns)
          .set({
            sent_count:        stats?.sent ?? 0,
            open_rate:         stats?.uniqueOpens && stats?.sent
              ? String(((stats.uniqueOpens / stats.sent) * 100).toFixed(2))
              : '0',
            click_rate:        stats?.uniqueClicks && stats?.sent
              ? String(((stats.uniqueClicks / stats.sent) * 100).toFixed(2))
              : '0',
            unsubscribe_count: stats?.unsubscribed ?? 0,
            bounce_count:      stats?.hardBounces  ?? 0,
            status:            (result as any).status ?? campaign.status,
            updated_at:        new Date(),
          })
          .where(eq(emailCampaigns.id, campaignId))

        this.logger.log(`✅ Stats campagne ${campaignId} synchronisées`)
      } catch (err: any) {
        this.logger.error(`❌ syncCampaignStats: ${err?.message}`)
      }
    }

    const [updated] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1)

    return updated ?? null
  }

  async getCampaignStats(_brevoCampaignId: number) {
    return null
  }

  // ═══════════════════════════════════════════════════════════
  // ROI
  // ═══════════════════════════════════════════════════════════

  async calculateAndSaveRoi(campaignId: string): Promise<{
    cost: number; revenue: number; roi: number | null
  }> {
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

  // ═══════════════════════════════════════════════════════════
  // Helpers privés
  // ═══════════════════════════════════════════════════════════

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
        brevo_message_id: data.messageId,
        created_by:       data.createdBy,
      })
    } catch (err: any) {
      this.logger.error(`logCommunication: ${err?.message}`)
    }
  }
}
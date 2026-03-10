// ============================================================
// email/email.service.ts
// Transactionnel : Resend
// Campagnes      : Brevo (nouvelle API @getbrevo/brevo v3)
// ============================================================

import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Resend }                from 'resend'
import { BrevoClient, Brevo }    from '@getbrevo/brevo'   // ← nouvelle API
import { db }                    from '../database/db.config'
import { emailCampaigns, communications, profiles } from '../database/schema'
import { eq, lte, inArray }      from 'drizzle-orm'
import {
  TEMPLATES,
  validateTemplates,
  type TemplateName,
  type TemplatePayload,
} from './templates.config'
import * as nodemailer from 'nodemailer'
import {CampaignStatus } from '../database/schema'

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


// ── Helper : mapping statut Brevo (EN) → CRM (FR) ────────────
// Centralisé ici pour être utilisé par syncCampaignStats ET
// le endpoint de migration one-shot.
export const BREVO_STATUS_MAP: Record<string, string> = {
  sent:       'envoyée',
  queued:     'planifiée',
  scheduled:  'planifiée',
  draft:      'brouillon',
  archive:    'envoyée',
  test:       'brouillon',
  suspended:  'brouillon',
  in_process: 'envoyée',
}

export function mapBrevoStatus(brevoStatus: string, fallback: string): string {
  return BREVO_STATUS_MAP[String(brevoStatus).toLowerCase()] ?? fallback
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
          templateId: Number(process.env.BREVO_WELCOME_TEMPLATE_ID ?? 2),
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
    // Guard : Brevo refuse toute date planifiée dans le passé
    if (data.scheduledAt && data.scheduledAt <= new Date()) {
      this.logger.warn(`⚠️ scheduledAt "${data.scheduledAt.toISOString()}" est dans le passé — ignoré, campagne créée en brouillon`)
      data.scheduledAt = undefined
    }

    let brevoCampaignId: number | undefined
    console.log('createCampaign data:', {
      name: data.name,
      subject: data.subject,
      htmlContent: data.htmlContent ? '[HTML CONTENT]' : 'MISSING',
      listIds: data.listIds,
      scheduledAt: data.scheduledAt?.toISOString() ?? 'N/A',
    })

    if (this.brevo) {
      try {
        const senderId = Number(process.env.BREVO_CAMPAIGN_SENDER_ID ?? process.env.BREVO_SENDER_ID)
        console.log('Using senderId:', senderId)
        if (!senderId || isNaN(senderId)) {
          this.logger.error('❌ BREVO_SENDER_ID manquant ou invalide — campagne impossible')
          throw new Error('BREVO_SENDER_ID non configuré')
        }

        const result = await this.brevo.emailCampaigns.createEmailCampaign({
          name:        data.name,
          subject:     data.subject,
          sender:      { id: senderId },
          htmlContent: data.htmlContent,
          recipients:  { listIds: data.listIds },
          scheduledAt: data.scheduledAt?.toISOString(),
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
        const result      = await this.brevo.emailCampaigns.getEmailCampaign({
          campaignId: campaign.brevo_campaign_id,
        })
        const htmlContent = (result as any).htmlContent as string | undefined
        const statistics  = (result as any).statistics ?? {}
        const brevoStatus = String((result as any).status ?? '')
        const mappedStatus = mapBrevoStatus(brevoStatus, campaign.status)

        this.logger.log(`   sync: brevo_status="${brevoStatus}" → mapped="${mappedStatus}"`)

        // ── Agrégation de campaignStats[] ──────────────────────────────────────
        // Brevo ne remplit globalStats que pour les grandes campagnes (>1 000 envois).
        // Pour les campagnes plus petites, les vraies données sont dans campaignStats,
        // un tableau d'une entrée par liste destinataire. On les somme ici.
        const rows: any[] = Array.isArray(statistics.campaignStats)
          ? statistics.campaignStats
          : []

        const sum = (key: string): number =>
          rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0)

        // Fallback sur globalStats si campaignStats est vide (cas théorique)
        const g = statistics.globalStats ?? {}

        const sentCount   = rows.length > 0 ? sum('delivered')       : (g.delivered       ?? g.sent ?? 0)
        const openCount   = rows.length > 0 ? sum('uniqueViews')      : (g.uniqueViews     ?? 0)
        const clickCount  = rows.length > 0 ? sum('uniqueClicks')     : (g.uniqueClicks    ?? 0)
        const unsubCount  = rows.length > 0 ? sum('unsubscriptions')  : (g.unsubscriptions ?? 0)
        const bounceCount = rows.length > 0 ? sum('hardBounces')      : (g.hardBounces     ?? 0)

        // Taux calculés sur la base des emails délivrés (cohérent avec le dashboard Brevo)
        const base      = sentCount > 0 ? sentCount : 1
        const openRate  = ((openCount  / base) * 100).toFixed(2)
        const clickRate = ((clickCount / base) * 100).toFixed(2)

        await db
          .update(emailCampaigns)
          .set({
            sent_count:        sentCount,
            open_count:        openCount,
            click_count:       clickCount,
            open_rate:         openRate,
            click_rate:        clickRate,
            unsubscribe_count: unsubCount,
            bounce_count:      bounceCount,
            status:            mappedStatus as CampaignStatus,
            html_content:       htmlContent ?? campaign.html_content, // Ne pas écraser si Brevo ne retourne pas le contenu
            updated_at:        new Date(),
          })
          .where(eq(emailCampaigns.id, campaignId))

        this.logger.log(
          `✅ Stats campagne ${campaignId} synchronisées — ` +
          `status="${mappedStatus}" sent=${sentCount} ` +
          `open=${openRate}% (${openCount}) click=${clickRate}% (${clickCount})`
        )
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

  // ═══════════════════════════════════════════════════════════
  // CRON — Sync automatique des campagnes planifiées
  // Tourne toutes les 5 minutes.
  // Détecte les campagnes dont scheduled_at est passé et
  // synchronise leur statut depuis Brevo.
  // ═══════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_5_MINUTES)
  async autosyncScheduledCampaigns(): Promise<void> {
    const now = new Date()

    // Récupère toutes les campagnes "planifiée" dont l'heure est passée
    const due = await db
      .select({ id: emailCampaigns.id, brevo_campaign_id: emailCampaigns.brevo_campaign_id })
      .from(emailCampaigns)
      .where(
        inArray(emailCampaigns.status, ['planifiée'])
      )

    const overdue = due.filter(c => {
      // On sync uniquement celles qui ont un brevo_campaign_id
      return !!c.brevo_campaign_id
    })

    if (overdue.length === 0) return

    this.logger.log(`⏱  autosync — ${overdue.length} campagne(s) planifiée(s) à vérifier`)

    let synced = 0
    let failed = 0

    for (const c of overdue) {
      try {
        await this.syncCampaignStats(c.id)
        synced++
      } catch (err: any) {
        this.logger.error(`❌ autosync échoué pour ${c.id}: ${err?.message}`)
        failed++
      }
    }

    this.logger.log(`✅ autosync terminé — ${synced} sync, ${failed} erreurs`)
  }

  // ═══════════════════════════════════════════════════════════
  // MIGRATION ONE-SHOT
  // Corrige les statuts Brevo (EN) déjà en DB vers le format CRM (FR).
  // Appeler via GET /email/campaigns/fix-statuses (admin only).
  // Peut être supprimé une fois exécuté.
  // ═══════════════════════════════════════════════════════════

  async fixLegacyStatuses(): Promise<{ updated: number }> {
    const all = await db
      .select({ id: emailCampaigns.id, status: emailCampaigns.status })
      .from(emailCampaigns)

    let updated = 0
    for (const c of all) {
      const mapped = mapBrevoStatus(c.status ?? '', '')
      if (mapped && mapped !== c.status) {
        await db
          .update(emailCampaigns)
          .set({ status: mapped as CampaignStatus , updated_at: new Date() })
          .where(eq(emailCampaigns.id, c.id))
        this.logger.log(`fix-statuses: ${c.id} "${c.status}" → "${mapped}"`)
        updated++
      }
    }
    this.logger.log(`✅ fix-statuses terminé — ${updated} campagne(s) corrigée(s)`)
    return { updated }
  }

}
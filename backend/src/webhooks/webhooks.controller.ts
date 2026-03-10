// ============================================================
// webhooks/webhooks.controller.ts
// Reçoit les événements Brevo (transactionnel + campagnes).
//
// SETUP dans le dashboard Brevo :
//   Settings → Tracking → Transactional webhook
//   URL : https://your-api.domain.com/api/v1/webhooks/brevo
//   Events : delivered, opened, clicked, soft_bounce, hard_bounce,
//            spam, unsubscribe, blocked
//
// MIGRATION requise (une seule fois) :
//   ALTER TABLE email_campaigns
//     ADD COLUMN IF NOT EXISTS open_count  INTEGER NOT NULL DEFAULT 0,
//     ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;
// ============================================================

import {
  Controller, Post, Body, Headers,
  HttpCode, HttpStatus, Logger,
} from '@nestjs/common'
import { db }                                   from '../database/db.config'
import { communications, emailCampaigns }       from '../database/schema'
import { eq, sql }                              from 'drizzle-orm'
import type { BrevoWebhookDto }                 from './dto/brevo-webhook.dto'

// ── Mapping événement → statut colonne communications ────────

const EVENT_TO_STATUS: Record<string, string> = {
  request:     'sent',
  delivered:   'delivered',
  opened:      'opened',
  click:       'clicked',
  soft_bounce: 'soft_bounce',
  hard_bounce: 'hard_bounce',
  spam:        'spam',
  unsubscribe: 'unsubscribed',
  blocked:     'blocked',
  deferred:    'deferred',
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name)

  /**
   * POST /webhooks/brevo
   *
   * Endpoint public (pas de JwtAuthGuard) — Brevo ne peut pas envoyer
   * de Bearer token. Protection via X-Brevo-Signature (secret partagé).
   *
   * Brevo peut batcher plusieurs événements dans une seule requête.
   */
  @Post('brevo')
  @HttpCode(HttpStatus.OK)
  async handleBrevoEvent(
    @Body()    payload: BrevoWebhookDto | BrevoWebhookDto[],
    @Headers('x-brevo-signature') signature?: string,
  ): Promise<{ received: number }> {

    // ── Signature verification ─────────────────────────────
    const secret = process.env.BREVO_WEBHOOK_SECRET
    if (secret && signature !== secret) {
      this.logger.warn('Brevo webhook — signature invalide, requête ignorée.')
      return { received: 0 }
    }

    const events  = Array.isArray(payload) ? payload : [payload]
    let processed = 0

    for (const event of events) {
      try {
        await this.processEvent(event)
        processed++
      } catch (err: any) {
        this.logger.error(
          `Erreur traitement événement webhook: ${err?.message}`,
          JSON.stringify(event),
        )
      }
    }

    this.logger.log(`Brevo webhook — ${processed}/${events.length} événements traités`)
    return { received: processed }
  }

  // ── Traitement d'un événement ─────────────────────────────────

  private async processEvent(event: BrevoWebhookDto): Promise<void> {
    const messageId    = event['message-id']
    const eventType    = event.event
    const mappedStatus = EVENT_TO_STATUS[eventType] ?? eventType

    this.logger.debug(
      `event="${eventType}" messageId="${messageId ?? '-'}" campId="${event.campId ?? '-'}"`,
    )

    // ── 1. Email transactionnel — mise à jour du statut ───────
    if (messageId) {
      await this.updateTransactionalStatus(messageId, eventType, mappedStatus, event.reason)
    }

    // ── 2. Désabonnement — bloquer les futurs envois ──────────
    if (eventType === 'unsubscribe' && event.email) {
      await this.handleUnsubscribe(event.email)
    }

    // ── 3. Campagne — mise à jour des métriques en temps réel ─
    if (event.campId) {
      await this.updateCampaignMetrics(event.campId, eventType)
    }
  }

  // ── 1. Transactionnel ─────────────────────────────────────────

  private async updateTransactionalStatus(
    messageId:    string,
    eventType:    string,
    mappedStatus: string,
    reason?:      string,
  ): Promise<void> {
    const [existing] = await db
      .select({ id: communications.id })
      .from(communications)
      .where(eq(communications.brevo_message_id, messageId))
      .limit(1)

    if (!existing) {
      this.logger.warn(
        `Aucune communication trouvée pour messageId="${messageId}" (event="${eventType}")`,
      )
      return
    }

    const updatePayload: Record<string, any> = {
      status:     mappedStatus,
      updated_at: new Date(),
    }

    // Stocke la raison du bounce/blocage pour le support et la conformité RGPD
    if (['soft_bounce', 'hard_bounce', 'blocked'].includes(eventType) && reason) {
      updatePayload.delivery_error = reason
    }

    await db
      .update(communications)
      .set(updatePayload)
      .where(eq(communications.id, existing.id))

    this.logger.debug(`Communication ${existing.id} → status="${mappedStatus}"`)
  }

  // ── 2. Désabonnement ──────────────────────────────────────────

  private async handleUnsubscribe(email: string): Promise<void> {
    await db.execute(sql`
      UPDATE contacts
      SET    is_subscribed = false,
             updated_at   = NOW()
      WHERE  lower(email) = lower(${email})
    `)
    this.logger.log(`Contact désabonné via webhook Brevo : ${email}`)
  }

  // ── 3. Campagne — métriques temps réel ───────────────────────
  //
  // Stratégie :
  //   open_count  / click_count  → compteurs bruts, incrémentés ici
  //   open_rate   / click_rate   → recalculés à partir de sent_count
  //   bounce_count               → incrémenté sur hard_bounce
  //   unsubscribe_count          → incrémenté sur unsubscribe
  //
  // Note : un même contact peut ouvrir/cliquer plusieurs fois.
  // Ces compteurs sont des indicateurs de tendance ; pour des taux
  // uniques stricts, une table d'événements dédiée serait nécessaire.

  private async updateCampaignMetrics(
    campId:    number,
    eventType: string,
  ): Promise<void> {

    switch (eventType) {

      case 'opened':
        await db.execute(sql`
          UPDATE email_campaigns
          SET
            open_count = COALESCE(open_count, 0) + 1,
            open_rate  = CASE
              WHEN COALESCE(sent_count, 0) > 0
              THEN ROUND(
                (COALESCE(open_count, 0) + 1)::numeric
                / sent_count::numeric * 100,
                2
              )
              ELSE open_rate
            END,
            updated_at = NOW()
          WHERE brevo_campaign_id = ${campId}
        `)
        this.logger.debug(`Campagne ${campId} — open_count +1`)
        break

      case 'click':
        await db.execute(sql`
          UPDATE email_campaigns
          SET
            click_count = COALESCE(click_count, 0) + 1,
            click_rate  = CASE
              WHEN COALESCE(sent_count, 0) > 0
              THEN ROUND(
                (COALESCE(click_count, 0) + 1)::numeric
                / sent_count::numeric * 100,
                2
              )
              ELSE click_rate
            END,
            updated_at = NOW()
          WHERE brevo_campaign_id = ${campId}
        `)
        this.logger.debug(`Campagne ${campId} — click_count +1`)
        break

      case 'hard_bounce':
        await db.execute(sql`
          UPDATE email_campaigns
          SET
            bounce_count = COALESCE(bounce_count, 0) + 1,
            updated_at   = NOW()
          WHERE brevo_campaign_id = ${campId}
        `)
        this.logger.debug(`Campagne ${campId} — bounce_count +1`)
        break

      case 'unsubscribe':
        await db.execute(sql`
          UPDATE email_campaigns
          SET
            unsubscribe_count = COALESCE(unsubscribe_count, 0) + 1,
            updated_at        = NOW()
          WHERE brevo_campaign_id = ${campId}
        `)
        this.logger.debug(`Campagne ${campId} — unsubscribe_count +1`)
        break

      // request, delivered, deferred, spam, soft_bounce, blocked
      // → updated_at à jour pour signaler un événement récent sur le dashboard
      default:
        await db.execute(sql`
          UPDATE email_campaigns
          SET updated_at = NOW()
          WHERE brevo_campaign_id = ${campId}
        `)
        break
    }
  }
}
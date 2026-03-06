// ============================================================
// webhooks/webhooks.controller.ts
// Receives Brevo transactional + campaign delivery events.
//
// SETUP in Brevo dashboard:
//   Settings → Tracking → Transactional webhook
//   URL: https://your-api.domain.com/api/v1/webhooks/brevo
//   Events: delivered, opened, clicked, soft_bounce, hard_bounce,
//           spam, unsubscribe, blocked
// ============================================================

import {
  Controller, Post, Body, Headers,
  HttpCode, HttpStatus, Logger,
} from '@nestjs/common'
import { db } from '../database/db.config'
import { communications, emailCampaigns } from '../database/schema'
import { eq, sql } from 'drizzle-orm'
import type { BrevoWebhookDto } from './dto/brevo-webhook.dto'

// Map Brevo event names → status column values
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
   * Brevo calls this endpoint for every tracked event.
   * We use the `message-id` field to find the matching row in `communications`
   * and patch its status so CRM users get live deliverability feedback.
   *
   * No JWT guard here — Brevo cannot send a Bearer token.
   * Instead we validate a shared secret via the X-Brevo-Signature header
   * (configure BREVO_WEBHOOK_SECRET in .env + Brevo dashboard).
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
      this.logger.warn('Brevo webhook — invalid signature, ignoring.')
      return { received: 0 }
    }

    // Brevo can batch multiple events in one request
    const events = Array.isArray(payload) ? payload : [payload]
    let processed = 0

    for (const event of events) {
      try {
        await this.processEvent(event)
        processed++
      } catch (err: any) {
        this.logger.error(`Webhook event processing failed: ${err?.message}`, event)
      }
    }

    return { received: processed }
  }

  // ── Private ───────────────────────────────────────────────

  private async processEvent(event: BrevoWebhookDto): Promise<void> {
    const messageId    = event['message-id']
    const eventType    = event.event
    const mappedStatus = EVENT_TO_STATUS[eventType] ?? eventType

    this.logger.debug(`Brevo event: ${eventType} — messageId=${messageId}`)

    // ── 1. Update transactional communication row ──────────
    if (messageId) {
      const [existing] = await db
        .select({ id: communications.id })
        .from(communications)
        .where(eq(communications.brevo_message_id, messageId))
        .limit(1)

      if (existing) {
        const updatePayload: any = {
          status:     mappedStatus,          // ← writes to communications.status
          updated_at: new Date(),
        }

        // Store bounce/block reason for debugging and compliance
        if (['soft_bounce', 'hard_bounce', 'blocked'].includes(eventType) && event.reason) {
          updatePayload.delivery_error = event.reason  // ← writes to communications.delivery_error
        }

        await db
          .update(communications)
          .set(updatePayload)
          .where(eq(communications.id, existing.id))
      } else {
        this.logger.warn(`No communication found for messageId=${messageId} (event=${eventType})`)
      }
    }

    // ── 2. Handle unsubscribe — block future sends ─────────
    if (eventType === 'unsubscribe' && event.email) {
      await db.execute(sql`
        UPDATE contacts
        SET    is_subscribed = false,
               updated_at   = NOW()
        WHERE  lower(email) = lower(${event.email})
      `)
      this.logger.log(`Contact unsubscribed via Brevo webhook: ${event.email}`)
    }

    // ── 3. Campaign event tracking ─────────────────────────
    // Full metric refresh via /communications/sync-campaigns (pulls from Brevo API).
    // Here we only touch updated_at so dashboards know a recent event occurred.
    if (event.campId && ['opened', 'click'].includes(eventType)) {
      await db.execute(sql`
        UPDATE email_campaigns
        SET    updated_at = NOW()
        WHERE  brevo_campaign_id = ${event.campId}
      `)
    }
  }
}
// ============================================================
// webhooks/dto/brevo-webhook.dto.ts
// Brevo sends POST payloads for each deliverability event.
// Docs: https://developers.brevo.com/docs/transactional-webhooks
// ============================================================

export type BrevoEventType =
  | 'request'        // email accepted for delivery
  | 'delivered'      // confirmed delivery to inbox
  | 'soft_bounce'    // temporary delivery failure
  | 'hard_bounce'    // permanent delivery failure
  | 'spam'           // marked as spam by recipient
  | 'unsubscribe'    // recipient clicked unsubscribe
  | 'opened'         // email opened (pixel tracked)
  | 'click'          // link clicked inside email
  | 'deferred'       // email queued, not yet delivered
  | 'blocked'        // blocked before sending

export interface BrevoWebhookDto {
  /** Brevo internal message ID — matches brevo_message_id in communications */
  'message-id': string
  /** Event type */
  event:        BrevoEventType
  email:        string
  /** Unix timestamp */
  date?:        string
  /** For click events */
  link?:        string
  /** Brevo campaign ID — present for campaign (bulk) emails */
  campId?:      number
  /** Template ID — present for transactional emails */
  templateId?:  number
  /** Bounce reason */
  reason?:      string
  tag?:         string
}
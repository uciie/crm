-- ============================================================
-- migrations/0004_brevo_deliverability.sql
--
-- Adds missing columns identified in the Brevo audit:
--   • communications.status        — tracks delivery lifecycle
--   • communications.delivery_error — stores bounce/block reason
--   • contacts.is_subscribed       — respects Brevo unsubscribes
--
-- Run once against your Supabase / PostgreSQL database.
-- Safe to run on existing data (uses IF NOT EXISTS / defaults).
-- ============================================================

-- ── 1. communications: delivery status ───────────────────────

ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS status VARCHAR(20)
    NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'opened', 'clicked',
                      'soft_bounce', 'hard_bounce', 'spam',
                      'unsubscribed', 'blocked', 'deferred'));

COMMENT ON COLUMN communications.status IS
  'Delivery lifecycle status synced from Brevo webhook events';

-- ── 2. communications: error detail ──────────────────────────

ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS delivery_error TEXT DEFAULT NULL;

COMMENT ON COLUMN communications.delivery_error IS
  'Human-readable error reason for bounced/blocked emails (from Brevo webhook)';

-- ── 3. contacts: subscription flag ───────────────────────────

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN contacts.is_subscribed IS
  'Set to false when Brevo fires an unsubscribe webhook for this contact email';

-- ── 4. Index for webhook lookups (message-id → communication) ─

CREATE INDEX IF NOT EXISTS idx_communications_brevo_message_id
  ON communications (brevo_message_id)
  WHERE brevo_message_id IS NOT NULL;

-- ── 5. Index for unsubscribe lookups (email → contact) ────────

CREATE INDEX IF NOT EXISTS idx_contacts_email_lower
  ON contacts (lower(email));

-- ── 6. Backfill existing rows with sensible defaults ──────────
-- (already handled by DEFAULT 'sent' above for new inserts;
--  existing rows get 'sent' implicitly from the DEFAULT clause)

-- Done ✔
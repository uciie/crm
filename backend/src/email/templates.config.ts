// ============================================================
// email/templates.config.ts
// Centralize all Brevo template IDs — never hardcode in services.
// Set each ID in your .env file and create the matching
// template in your Brevo dashboard.
// ============================================================

export const BREVO_TEMPLATES = {
  // ── Auth ──────────────────────────────────────────────────
  WELCOME:               Number(process.env.BREVO_TEMPLATE_WELCOME        ?? 0),
  RESET_PASSWORD:        Number(process.env.BREVO_TEMPLATE_RESET_PASSWORD ?? 0),

  // ── Leads ─────────────────────────────────────────────────
  LEAD_CREATED:          Number(process.env.BREVO_TEMPLATE_LEAD_CREATED          ?? 0),
  LEAD_ASSIGNED:         Number(process.env.BREVO_TEMPLATE_LEAD_ASSIGNED         ?? 0),
  LEAD_STATUS_CHANGED:   Number(process.env.BREVO_TEMPLATE_LEAD_STATUS_CHANGED   ?? 0),
  LEAD_WON:              Number(process.env.BREVO_TEMPLATE_LEAD_WON              ?? 0),
  LEAD_LOST:             Number(process.env.BREVO_TEMPLATE_LEAD_LOST             ?? 0),

  // ── Tasks ─────────────────────────────────────────────────
  TASK_ASSIGNED:         Number(process.env.BREVO_TEMPLATE_TASK_ASSIGNED   ?? 0),
  TASK_DUE_SOON:         Number(process.env.BREVO_TEMPLATE_TASK_DUE_SOON   ?? 0),
  TASK_OVERDUE:          Number(process.env.BREVO_TEMPLATE_TASK_OVERDUE    ?? 0),

  // ── Pipeline ──────────────────────────────────────────────
  DEAL_STAGE_CHANGED:    Number(process.env.BREVO_TEMPLATE_DEAL_STAGE_CHANGED ?? 0),
} as const

export type BrevoTemplateKey = keyof typeof BREVO_TEMPLATES

// Map of template IDs that MUST be configured — startup will warn if missing
export const REQUIRED_TEMPLATES: BrevoTemplateKey[] = [
  'WELCOME',
  'LEAD_ASSIGNED',
  'TASK_ASSIGNED',
]

export function validateTemplates(): void {
  const missing = REQUIRED_TEMPLATES.filter(key => BREVO_TEMPLATES[key] === 0)
  if (missing.length > 0) {
    console.warn(
      `[EmailService] ⚠️  Missing Brevo template IDs for: ${missing.join(', ')}. ` +
      `Set BREVO_TEMPLATE_<KEY> in your .env file.`
    )
  }
}
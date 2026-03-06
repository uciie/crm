// ============================================================
// email/dto/send-email.dto.ts
// ============================================================

export interface EmailRecipient {
  email: string
  name?: string
}

export interface SendTransactionalDto {
  to:         EmailRecipient[]
  templateId: number
  /** Dynamic variables passed to the Brevo template — use {{ params.VAR }} */
  params?:    Record<string, string | number | boolean>
  /** Override the template sender for specific transactional emails */
  sender?:    EmailRecipient
  replyTo?:   EmailRecipient
  /** Attach a brevo_message_id to the communications table row */
  logTo?: {
    contactId?:  string
    leadId?:     string
    companyId?:  string
    createdBy:   string
    subject?:    string
  }
}

export interface BrevoMessageIdResult {
  messageId: string
}
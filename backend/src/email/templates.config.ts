// ============================================================
// email/templates.config.ts
// Templates HTML locaux pour Resend.
//
// FIX : les `satisfies TemplateRenderer<X>` sur chaque entrée individuelle
// faisaient inférer à TypeScript le type de TEMPLATES comme une intersection
// de tous les types de params → erreur à l'appel de renderer(options.params).
// Solution : typer chaque renderer avec (params: any) => TemplatePayload
// et laisser la vérification de structure au niveau de l'objet global.
// ============================================================

export type TemplateName =
  | 'WELCOME'
  | 'LEAD_ASSIGNED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_WON'
  | 'LEAD_LOST'
  | 'DEAL_STAGE_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'RESET_PASSWORD'

export interface TemplatePayload {
  subject: string
  html:    string
}

// Chaque renderer est une fonction (params: any) → TemplatePayload.
// Les types de params sont documentés en commentaire pour la lisibilité,
// mais ne sont pas forcés ici pour éviter l'intersection TypeScript.
export type TemplateRenderer = (params: any) => TemplatePayload

// ── Templates ─────────────────────────────────────────────────

export const TEMPLATES: Record<TemplateName, TemplateRenderer> = {

  // params: { full_name, role, login_url }
  WELCOME: (p) => ({
    subject: `Bienvenue dans le CRM, ${p.full_name} !`,
    html: `
      <h2>Bonjour ${p.full_name} 👋</h2>
      <p>Votre compte <strong>${p.role}</strong> est prêt.</p>
      <a href="${p.login_url}">Accéder au CRM</a>
    `,
  }),

  // params: { assignee_name, lead_title, contact_name, lead_value, crm_url }
  LEAD_ASSIGNED: (p) => ({
    subject: `Nouveau lead assigné : ${p.lead_title}`,
    html: `
      <h2>Bonjour ${p.assignee_name},</h2>
      <p>Le lead <strong>${p.lead_title}</strong> vous a été assigné.</p>
      <ul>
        <li>Contact : ${p.contact_name}</li>
        <li>Valeur estimée : ${p.lead_value}</li>
      </ul>
      <a href="${p.crm_url}">Voir le lead</a>
    `,
  }),

  // params: { assignee_name, lead_title, old_stage, new_stage, crm_url }
  DEAL_STAGE_CHANGED: (p) => ({
    subject: `Pipeline : ${p.lead_title} → ${p.new_stage}`,
    html: `
      <h2>Bonjour ${p.assignee_name},</h2>
      <p>Le deal <strong>${p.lead_title}</strong> est passé de
         <em>${p.old_stage}</em> à <strong>${p.new_stage}</strong>.</p>
      <a href="${p.crm_url}">Voir le deal</a>
    `,
  }),

  // params: { assignee_name, lead_title, crm_url }
  LEAD_WON: (p) => ({
    subject: `🎉 Deal gagné : ${p.lead_title}`,
    html: `
      <h2>Félicitations ${p.assignee_name} !</h2>
      <p>Le deal <strong>${p.lead_title}</strong> est gagné.</p>
      <a href="${p.crm_url}">Voir le deal</a>
    `,
  }),

  // params: { assignee_name, lead_title, crm_url }
  LEAD_LOST: (p) => ({
    subject: `Deal perdu : ${p.lead_title}`,
    html: `
      <h2>Bonjour ${p.assignee_name},</h2>
      <p>Le deal <strong>${p.lead_title}</strong> est marqué comme perdu.</p>
      <a href="${p.crm_url}">Voir le deal</a>
    `,
  }),

  // params: { contact_name, lead_title, days_inactive }
  LEAD_STATUS_CHANGED: (p) => ({
    subject: `Relance : ${p.lead_title}`,
    html: `
      <p>Bonjour ${p.contact_name}, votre lead <strong>${p.lead_title}</strong>
      est inactif depuis ${p.days_inactive} jours.</p>
    `,
  }),

  // params: { assignee_name, task_title, priority, due_date, contact_name, crm_url }
  TASK_ASSIGNED: (p) => ({
    subject: `Nouvelle tâche assignée : ${p.task_title}`,
    html: `
      <h2>Bonjour ${p.assignee_name},</h2>
      <p>Une tâche vous a été assignée : <strong>${p.task_title}</strong></p>
      <ul>
        <li>Priorité : ${p.priority}</li>
        <li>Échéance : ${p.due_date}</li>
        <li>Contact  : ${p.contact_name}</li>
      </ul>
      <a href="${p.crm_url}">Voir mes tâches</a>
    `,
  }),

  // params: { assignee_name, task_title, due_date }
  TASK_DUE_SOON: (p) => ({
    subject: `⏰ Tâche bientôt due : ${p.task_title}`,
    html: `
      <p>Bonjour ${p.assignee_name}, la tâche <strong>${p.task_title}</strong>
      arrive à échéance le ${p.due_date}.</p>
    `,
  }),

  // params: { assignee_name, task_title }
  TASK_OVERDUE: (p) => ({
    subject: `🚨 Tâche en retard : ${p.task_title}`,
    html: `
      <p>Bonjour ${p.assignee_name}, la tâche <strong>${p.task_title}</strong>
      est en retard.</p>
    `,
  }),

  // params: { full_name, reset_url }
  RESET_PASSWORD: (p) => ({
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <p>Bonjour ${p.full_name},
      <a href="${p.reset_url}">cliquez ici</a>
      pour réinitialiser votre mot de passe.</p>
    `,
  }),
}

// ── Validation au démarrage ───────────────────────────────────

export const REQUIRED_TEMPLATES: TemplateName[] = ['WELCOME', 'LEAD_ASSIGNED', 'TASK_ASSIGNED']

export function validateTemplates(): void {
  // Templates locaux — toujours disponibles. Fonction conservée pour compatibilité.
  console.log('[EmailService] ✔ Templates locaux chargés.')
}
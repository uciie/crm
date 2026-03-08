// scripts/create-brevo-templates.ts
// Exécuter UNE SEULE FOIS : npx ts-node scripts/create-brevo-templates.ts
// ============================================================

import { BrevoClient } from '@getbrevo/brevo'
import * as dotenv from 'dotenv'
dotenv.config()
console.log(process.env.BREVO_API_KEY) // Vérification rapide de la clé API
console.log(process.env.BREVO_SENDER_ID) // Vérification rapide de l'ID du sender
console.log(process.env.BREVO_SENDER_EMAIL) // Vérification rapide de l'email du sender
console.log(process.env.BREVO_SENDER_NAME) // Vérification rapide du nom du sender
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY ?? '' })

const SENDER = {
  id:   Number(process.env.BREVO_SENDER_ID ?? 1),
}

// ── Templates à créer ────────────────────────────────────────

const templates = [

  {
    templateName: 'WELCOME',
    subject:      'Bienvenue dans le CRM, {{ params.FULL_NAME }} !',
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body      { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper  { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header   { background: #4f46e5; padding: 32px; text-align: center; }
    .header h1{ color: #fff; margin: 0; font-size: 24px; }
    .body     { padding: 32px; color: #333; }
    .body p   { line-height: 1.6; }
    .btn      { display: inline-block; margin-top: 24px; padding: 12px 28px;
                background: #4f46e5; color: #fff; text-decoration: none;
                border-radius: 6px; font-weight: bold; }
    .footer   { padding: 16px 32px; background: #f9f9f9;
                text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>👋 Bienvenue dans le CRM</h1>
    </div>
    <div class="body">
      <p>Bonjour <strong>{{ params.FULL_NAME }}</strong>,</p>
      <p>
        Votre compte a bien été créé avec le rôle
        <strong>{{ params.ROLE }}</strong>.
      </p>
      <p>Vous pouvez dès maintenant accéder à votre espace :</p>
      <a href="{{ params.LOGIN_URL }}" class="btn">Accéder au CRM</a>
      <p style="margin-top: 32px; color: #999; font-size: 13px;">
        Si vous n'êtes pas à l'origine de cette création de compte,
        ignorez simplement cet email.
      </p>
    </div>
    <div class="footer">
      © 2025 CRM — Cet email a été envoyé automatiquement, merci de ne pas y répondre.
    </div>
  </div>
</body>
</html>
    `,
  },

  {
    templateName: 'LEAD_ASSIGNED',
    subject:      'Nouveau lead assigné : {{ params.LEAD_TITLE }}',
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body      { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper  { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header   { background: #0ea5e9; padding: 32px; text-align: center; }
    .header h1{ color: #fff; margin: 0; font-size: 22px; }
    .body     { padding: 32px; color: #333; }
    .info     { background: #f0f9ff; border-left: 4px solid #0ea5e9;
                padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info p   { margin: 6px 0; font-size: 14px; }
    .btn      { display: inline-block; margin-top: 24px; padding: 12px 28px;
                background: #0ea5e9; color: #fff; text-decoration: none;
                border-radius: 6px; font-weight: bold; }
    .footer   { padding: 16px 32px; background: #f9f9f9;
                text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎯 Nouveau lead assigné</h1>
    </div>
    <div class="body">
      <p>Bonjour <strong>{{ params.ASSIGNEE_NAME }}</strong>,</p>
      <p>Un nouveau lead vous a été assigné :</p>
      <div class="info">
        <p><strong>Lead :</strong> {{ params.LEAD_TITLE }}</p>
        <p><strong>Contact :</strong> {{ params.CONTACT_NAME }}</p>
        <p><strong>Valeur estimée :</strong> {{ params.LEAD_VALUE }}</p>
      </div>
      <a href="{{ params.CRM_URL }}" class="btn">Voir le lead</a>
    </div>
    <div class="footer">
      © 2025 CRM — Notification automatique
    </div>
  </div>
</body>
</html>
    `,
  },

  {
    templateName: 'TASK_ASSIGNED',
    subject:      'Nouvelle tâche assignée : {{ params.TASK_TITLE }}',
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body      { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper  { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header   { background: #f59e0b; padding: 32px; text-align: center; }
    .header h1{ color: #fff; margin: 0; font-size: 22px; }
    .body     { padding: 32px; color: #333; }
    .info     { background: #fffbeb; border-left: 4px solid #f59e0b;
                padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info p   { margin: 6px 0; font-size: 14px; }
    .btn      { display: inline-block; margin-top: 24px; padding: 12px 28px;
                background: #f59e0b; color: #fff; text-decoration: none;
                border-radius: 6px; font-weight: bold; }
    .footer   { padding: 16px 32px; background: #f9f9f9;
                text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>✅ Nouvelle tâche assignée</h1>
    </div>
    <div class="body">
      <p>Bonjour <strong>{{ params.ASSIGNEE_NAME }}</strong>,</p>
      <p>Une nouvelle tâche vous a été assignée :</p>
      <div class="info">
        <p><strong>Tâche :</strong> {{ params.TASK_TITLE }}</p>
        <p><strong>Priorité :</strong> {{ params.PRIORITY }}</p>
        <p><strong>Échéance :</strong> {{ params.DUE_DATE }}</p>
        <p><strong>Contact :</strong> {{ params.CONTACT_NAME }}</p>
      </div>
      <a href="{{ params.CRM_URL }}" class="btn">Voir mes tâches</a>
    </div>
    <div class="footer">
      © 2025 CRM — Notification automatique
    </div>
  </div>
</body>
</html>
    `,
  },

]

// ── Création sur Brevo ────────────────────────────────────────

async function main() {
  console.log('🚀 Création des templates Brevo...\n')

  for (const tpl of templates) {
    try {
      const result = await brevo.transactionalEmails.createSmtpTemplate({
        templateName: tpl.templateName,
        subject:      tpl.subject,
        htmlContent:  tpl.htmlContent,
        sender:       SENDER,
        isActive:     true,
      })

      // L'ID retourné est dans result.id avec la nouvelle API
      const id = (result as any).id ?? (result as any).templateId ?? JSON.stringify(result)
      console.log(`✅ Template "${tpl.templateName}" créé — ID: ${id}`)
      console.log(`   → Ajoutez dans Vercel : BREVO_${tpl.templateName}_TEMPLATE_ID=${id}\n`)

    } catch (err: any) {
      console.error(`❌ Erreur pour "${tpl.templateName}": ${err?.message}`)
    }
  }

  console.log('✔ Terminé.')
}

main()
// ============================================================
// scripts/create-brevo-campaign-templates.ts
// Crée les templates HTML de campagnes dans Brevo
//
// Exécuter UNE SEULE FOIS :
//   npx ts-node ./scripts/create-brevo-campaign-templates.ts
//
// Les IDs retournés sont à stocker dans .env :
//   BREVO_TPL_NEWSLETTER=xx
//   BREVO_TPL_PROMO=xx
//   BREVO_TPL_RELANCE=xx
//   BREVO_TPL_ONBOARDING=xx
// ============================================================

import { BrevoClient } from '@getbrevo/brevo'
import * as dotenv from 'dotenv'
dotenv.config()

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY ?? '' })

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? ''
const SENDER_NAME  = process.env.BREVO_SENDER_NAME  ?? 'CRM'

// ── Palette cohérente avec page.tsx ──────────────────────────
// open_rate  → #60a5fa (bleu)
// click_rate → #34d399 (vert)
// envoyée    → #34d399 (vert)
// planifiée  → #f59e0b (ambre)
// brouillon  → #94a3b8 (gris)
// accent CTA → #4f46e5 (indigo)

// ── Shared CSS inlinable ─────────────────────────────────────
const BASE_STYLES = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background:#f1f5f9; color:#334155; }
  .wrapper { max-width:600px; margin:32px auto; background:#ffffff;
             border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; }
  .header  { padding:40px 32px; text-align:center; }
  .header h1 { font-size:24px; font-weight:700; color:#ffffff; margin-bottom:6px; }
  .header p  { font-size:13px; color:rgba(255,255,255,0.8); }
  .body    { padding:32px; }
  .section { margin-bottom:28px; }
  .section h2 { font-size:16px; font-weight:700; color:#1e293b;
                padding-bottom:8px; border-bottom:2px solid #e0e7ff; margin-bottom:14px; }
  .section p  { font-size:13px; line-height:1.75; color:#475569; }
  .highlight  { background:#f0f9ff; border-left:4px solid #60a5fa;
                padding:14px 16px; border-radius:6px; margin:14px 0; }
  .highlight p { font-size:13px; color:#0369a1; }
  .btn { display:inline-block; padding:12px 28px; background:#4f46e5; color:#ffffff !important;
         text-decoration:none; border-radius:8px; font-weight:700; font-size:14px; margin-top:8px; }
  .btn-green { background:#34d399; }
  .btn-amber { background:#f59e0b; }
  .divider { height:1px; background:#f1f5f9; margin:24px 0; }
  .footer  { background:#f8fafc; padding:24px 32px; text-align:center;
             border-top:1px solid #e2e8f0; }
  .footer p   { font-size:11px; color:#94a3b8; line-height:1.7; }
  .footer a   { color:#4f46e5; text-decoration:none; }
`

// ── Helper : wraps content in full HTML doc ──────────────────
function htmlDoc(headerBg: string, headerContent: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header" style="background:${headerBg}">
      ${headerContent}
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>Vous recevez cet email car vous êtes inscrit à nos communications.</p>
      <p style="margin-top:6px;">
        <a href="{{unsubscribeUrl}}">Se désabonner</a>
        &nbsp;·&nbsp;
        <a href="{{mirrorUrl}}">Voir en ligne</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES
// Variables Brevo : {{ contact.FIRSTNAME }}, {{ params.XXX }}
// ─────────────────────────────────────────────────────────────

const TEMPLATES = [

  // ── 1. NEWSLETTER MENSUELLE ──────────────────────────────────
  {
    envKey:       'BREVO_TPL_NEWSLETTER',
    templateName: 'NEWSLETTER_MENSUELLE',
    subject:      '📰 Newsletter {{ params.MOIS }} — Actualités du CRM',
    htmlContent: htmlDoc(
      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      `<h1>📰 Newsletter {{ params.MOIS }}</h1>
       <p>Les actualités de votre espace CRM</p>`,
      `<div class="section">
        <h2>👋 Bonjour {{ contact.FIRSTNAME }} !</h2>
        <p>{{ params.INTRO_TEXT }}</p>
      </div>

      <div class="section">
        <h2>🚀 Nouveautés du mois</h2>
        <p>{{ params.NEWS_TEXT }}</p>
        <div class="highlight">
          <p><strong>{{ params.HIGHLIGHT_TITLE }}</strong><br>{{ params.HIGHLIGHT_TEXT }}</p>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section">
        <h2>📊 Vos chiffres clés</h2>
        <p>{{ params.STATS_TEXT }}</p>
      </div>

      <div class="section">
        <h2>💡 Conseil du mois</h2>
        <p>{{ params.TIP_TEXT }}</p>
        <br>
        <a href="{{ params.CTA_URL }}" class="btn">{{ params.CTA_LABEL }}</a>
      </div>`,
    ),
  },

  // ── 2. OFFRE PROMOTIONNELLE ───────────────────────────────────
  {
    envKey:       'BREVO_TPL_PROMO',
    templateName: 'OFFRE_PROMOTIONNELLE',
    subject:      '🎁 Offre exclusive pour vous, {{ contact.FIRSTNAME }} !',
    htmlContent: htmlDoc(
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      `<h1>🎁 Offre exclusive</h1>
       <div style="display:inline-block;background:#fff;color:#ef4444;font-weight:700;
                   font-size:22px;padding:8px 22px;border-radius:50px;margin-top:12px;">
         -{{ params.DISCOUNT }}%
       </div>`,
      `<div class="section" style="text-align:center;">
        <p style="font-size:15px;color:#334155;">
          Bonjour <strong>{{ contact.FIRSTNAME }}</strong>,
        </p>
        <p style="margin-top:10px;">{{ params.OFFER_INTRO }}</p>

        <div style="background:#fff7ed;border:2px dashed #f59e0b;border-radius:10px;
                    padding:24px;margin:24px 0;text-align:center;">
          <p style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">
            {{ params.OFFER_TITLE }}
          </p>
          <p style="font-size:13px;color:#78350f;">{{ params.OFFER_DETAILS }}</p>
          <p style="font-size:26px;font-weight:900;color:#ef4444;
                    letter-spacing:4px;margin:16px 0;">
            {{ params.PROMO_CODE }}
          </p>
          <p style="font-size:11px;color:#94a3b8;">
            Valable jusqu'au {{ params.EXPIRY_DATE }}
          </p>
        </div>

        <a href="{{ params.CTA_URL }}" class="btn btn-amber">{{ params.CTA_LABEL }}</a>
      </div>`,
    ),
  },

  // ── 3. RELANCE PROSPECTS INACTIFS ────────────────────────────
  {
    envKey:       'BREVO_TPL_RELANCE',
    templateName: 'RELANCE_INACTIFS',
    subject:      '💬 {{ contact.FIRSTNAME }}, on a pensé à vous…',
    htmlContent: htmlDoc(
      'linear-gradient(135deg, #0ea5e9 0%, #4f46e5 100%)',
      `<h1>💬 On a pensé à vous</h1>
       <p>Ça fait un moment qu'on ne s'est pas parlé</p>`,
      `<div class="section">
        <h2>Bonjour {{ contact.FIRSTNAME }} 👋</h2>
        <p>{{ params.RELANCE_INTRO }}</p>
      </div>

      <div class="section">
        <h2>Ce qui a changé depuis</h2>
        <p>{{ params.UPDATES_TEXT }}</p>
        <div class="highlight">
          <p>{{ params.HIGHLIGHT_TEXT }}</p>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section">
        <h2>Une question ? On est là.</h2>
        <p>{{ params.CLOSING_TEXT }}</p>
        <br>
        <a href="{{ params.CTA_URL }}" class="btn">{{ params.CTA_LABEL }}</a>
      </div>`,
    ),
  },

  // ── 4. ONBOARDING NOUVEAUX CONTACTS ──────────────────────────
  {
    envKey:       'BREVO_TPL_ONBOARDING',
    templateName: 'ONBOARDING_NOUVEAU_CONTACT',
    subject:      '👋 Bienvenue {{ contact.FIRSTNAME }} — Votre espace CRM est prêt',
    htmlContent: htmlDoc(
      'linear-gradient(135deg, #34d399 0%, #0ea5e9 100%)',
      `<h1>👋 Bienvenue !</h1>
       <p>Votre espace CRM est prêt à être utilisé</p>`,
      `<div class="section">
        <h2>Bonjour {{ contact.FIRSTNAME }} !</h2>
        <p>Votre compte a bien été créé. Vous pouvez dès maintenant accéder à votre espace personnel.</p>
      </div>

      <div class="section">
        <h2>🚀 Pour démarrer</h2>

        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
          <div style="min-width:28px;height:28px;background:#e0e7ff;border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:700;color:#4f46e5;font-size:13px;">1</div>
          <p style="padding-top:4px;"><strong>Connectez-vous</strong> à votre espace avec votre adresse email.</p>
        </div>

        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
          <div style="min-width:28px;height:28px;background:#d1fae5;border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:700;color:#34d399;font-size:13px;">2</div>
          <p style="padding-top:4px;"><strong>Complétez votre profil</strong> pour personnaliser votre expérience.</p>
        </div>

        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="min-width:28px;height:28px;background:#e0f2fe;border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:700;color:#0ea5e9;font-size:13px;">3</div>
          <p style="padding-top:4px;"><strong>Explorez le tableau de bord</strong> et vos premières campagnes.</p>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section" style="text-align:center;">
        <a href="{{ params.LOGIN_URL }}" class="btn btn-green">Accéder à mon espace →</a>
        <p style="margin-top:14px;font-size:12px;color:#94a3b8;">
          Des questions ? Contactez-nous à
          <a href="mailto:{{ params.SUPPORT_EMAIL }}" style="color:#4f46e5;">
            {{ params.SUPPORT_EMAIL }}
          </a>
        </p>
      </div>`,
    ),
  },
]

// ─────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────

async function run() {
  console.log('🚀 Création des templates campagnes Brevo…\n')

  const results: Record<string, number> = {}

  for (const tpl of TEMPLATES) {
    try {
      const res = await (brevo.transactionalEmails as any).createSmtpTemplate({
        templateName: tpl.templateName,
        subject:      tpl.subject,
        htmlContent:  tpl.htmlContent,
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        isActive: true,
      })

      const id: number = res?.body?.id ?? res?.id
      results[tpl.envKey] = id
      console.log(`✅ ${tpl.templateName.padEnd(30)} → ID ${id}`)
    } catch (err: any) {
      console.error(`❌ ${tpl.templateName} — Erreur :`, err?.message ?? err)
    }
  }

  console.log('\n─────────────────────────────────────────')
  console.log('Ajoutez ces lignes dans votre .env / Vercel :\n')
  for (const [key, id] of Object.entries(results)) {
    console.log(`${key}=${id}`)
  }
  console.log('─────────────────────────────────────────\n')
}

run().catch(console.error)
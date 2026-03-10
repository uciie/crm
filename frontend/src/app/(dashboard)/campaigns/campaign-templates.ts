// ============================================================
// campaign-html-templates.ts
// HTMLs prêts à coller directement dans le champ "Contenu HTML"
// du formulaire CampaignModal.
// ============================================================

// ── 1. Lancement produit Q1 ───────────────────────────────────
export const HTML_LANCEMENT_Q1 = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
    .wrapper{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
    .header{background:#4f46e5;padding:32px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:22px}
    .body{padding:32px;color:#333;line-height:1.6}
    .btn{display:inline-block;margin-top:24px;padding:12px 28px;background:#fff;color:#4f46e5 !important;text-decoration:none;border-radius:6px;font-weight:bold;border:2px solid #4f46e5;cursor:pointer}
    .btn:hover{background:#4f46e5;color:#fff !important}
    .footer{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>🚀 Lancement produit Q1</h1></div>
    <div class="body">
      <p>Bonjour <strong>{{ contact.FIRSTNAME }}</strong>,</p>
      <p>Nous sommes ravis de vous présenter notre <strong>nouvelle offre Q1 2025</strong>.</p>
      <ul>
        <li>✅ Accès illimité à toutes les fonctionnalités</li>
        <li>✅ Support prioritaire 7j/7</li>
        <li>✅ Onboarding personnalisé offert</li>
      </ul>
      <p>Profitez de <strong>-30% pendant 48h</strong> avec le code <code>LAUNCH30</code>.</p>
      <a href="https://uciie.github.io/portfolio/?utm_campaign=lancement-q1&utm_source=email&utm_medium=campaign" target="_blank" class="btn">Découvrir l'offre</a>
    </div>
    <div class="footer">© 2025 CRM — Notification automatique</div>
  </div>
</body>
</html>`

// ── 2. Newsletter Mars 2025 ───────────────────────────────────
export const HTML_NEWSLETTER_MARS = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
    .wrapper{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
    .header{background:#0ea5e9;padding:32px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:22px}
    .body{padding:32px;color:#333;line-height:1.6}
    .btn{display:inline-block;margin-top:24px;padding:12px 28px;background:#fff;color:#0ea5e9 !important;text-decoration:none;border-radius:6px;font-weight:bold;border:2px solid #0ea5e9;cursor:pointer}
    .btn:hover{background:#0ea5e9;color:#fff !important}
    .footer{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>📰 Newsletter — Mars 2025</h1></div>
    <div class="body">
      <p>Bonjour <strong>{{ contact.FIRSTNAME }}</strong>,</p>
      <p>Voici les actualités du mois de mars :</p>
      <h3 style="color:#0ea5e9">📌 Nouveautés CRM</h3>
      <p>Le module <strong>Tâches & Agenda</strong> est désormais disponible avec vue calendrier.</p>
      <h3 style="color:#0ea5e9">📊 Chiffres du mois</h3>
      <ul>
        <li>1 240 nouveaux contacts ajoutés</li>
        <li>87 leads qualifiés</li>
        <li>32 deals signés</li>
      </ul>
      <a href="https://uciie.github.io/portfolio/?utm_campaign=newsletter-mars-2025&utm_source=email&utm_medium=campaign" target="_blank" class="btn">Accéder au tableau de bord</a>
    </div>
    <div class="footer">© 2025 CRM — Notification automatique</div>
  </div>
</body>
</html>`

// ── 3. Relance prospects inactifs ─────────────────────────────
export const HTML_RELANCE_INACTIFS = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
    .wrapper{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
    .header{background:#f59e0b;padding:32px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:22px}
    .body{padding:32px;color:#333;line-height:1.6}
    .btn{display:inline-block;margin-top:24px;padding:12px 28px;background:#fff;color:#f59e0b !important;text-decoration:none;border-radius:6px;font-weight:bold;border:2px solid #f59e0b;cursor:pointer}
    .btn:hover{background:#f59e0b;color:#fff !important}
    .footer{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>💬 On a pensé à vous</h1></div>
    <div class="body">
      <p>Bonjour <strong>{{ contact.FIRSTNAME }}</strong>,</p>
      <p>Cela fait un moment que nous ne vous avons pas vu sur la plateforme.</p>
      <p>Voici ce que vous avez manqué :</p>
      <ul>
        <li>🆕 3 nouvelles intégrations disponibles</li>
        <li>📈 Rapports de performance améliorés</li>
        <li>🎯 Segmentation avancée des contacts</li>
      </ul>
      <p style="color:#999;font-size:13px">Votre compte est toujours actif et vos données préservées.</p>
      <a href="https://uciie.github.io/portfolio/?utm_campaign=relance-inactifs&utm_source=email&utm_medium=campaign" target="_blank" class="btn">Reprendre là où j'en étais</a>
    </div>
    <div class="footer">© 2025 CRM — Notification automatique</div>
  </div>
</body>
</html>`

// ── 4. Promo Printemps ────────────────────────────────────────
export const HTML_PROMO_PRINTEMPS = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
    .wrapper{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
    .header{background:#ec4899;padding:32px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:22px}
    .body{padding:32px;color:#333;line-height:1.6}
    .btn{display:inline-block;margin-top:24px;padding:12px 28px;background:#fff;color:#ec4899 !important;text-decoration:none;border-radius:6px;font-weight:bold;border:2px solid #ec4899;cursor:pointer}
    .btn:hover{background:#ec4899;color:#fff !important}
    .footer{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>🌸 Offre Printemps — -20%</h1></div>
    <div class="body">
      <p>Bonjour <strong>{{ contact.FIRSTNAME }}</strong>,</p>
      <p>Le printemps arrive et on célèbre ça avec vous !</p>
      <div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:16px;margin:20px 0;border-radius:4px">
        <p style="margin:0;font-size:20px;font-weight:bold;color:#ec4899">-20% sur tous nos forfaits</p>
        <p style="margin:6px 0 0;color:#6b7280">Offre valable 48h — jusqu'au 7 avril 2025</p>
      </div>
      <p>Code promo : <strong style="background:#fdf2f8;padding:4px 8px;border-radius:4px">SPRING20</strong></p>
      <a href="https://uciie.github.io/portfolio/?utm_campaign=promo-printemps&utm_source=email&utm_medium=campaign" target="_blank" class="btn">J'en profite maintenant</a>
    </div>
    <div class="footer">© 2025 CRM — Notification automatique</div>
  </div>
</body>
</html>`

// ── 5. Onboarding nouveaux contacts ──────────────────────────
export const HTML_ONBOARDING = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
    .wrapper{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
    .header{background:#4f46e5;padding:32px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:22px}
    .body{padding:32px;color:#333;line-height:1.6}
    .btn{display:inline-block;margin-top:24px;padding:12px 28px;background:#fff;color:#4f46e5 !important;text-decoration:none;border-radius:6px;font-weight:bold;border:2px solid #4f46e5;cursor:pointer}
    .btn:hover{background:#4f46e5;color:#fff !important}
    .footer{padding:16px 32px;background:#f9f9f9;text-align:center;font-size:12px;color:#999}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>👋 Bienvenue dans le CRM</h1></div>
    <div class="body">
      <p>Bonjour <strong>{{ contact.FIRSTNAME }}</strong>,</p>
      <p>Votre compte est prêt. Voici comment démarrer :</p>
      <ol style="padding-left:20px">
        <li style="margin-bottom:8px">📇 Importez vos contacts</li>
        <li style="margin-bottom:8px">🎯 Créez votre premier lead dans le pipeline</li>
        <li style="margin-bottom:8px">📅 Planifiez une tâche ou un rendez-vous</li>
        <li style="margin-bottom:8px">📊 Consultez votre tableau de bord</li>
      </ol>
      <p style="color:#999;font-size:13px">Notre équipe est disponible pour vous accompagner.</p>
      <a href="https://uciie.github.io/portfolio/?utm_campaign=onboarding-new&utm_source=email&utm_medium=campaign" target="_blank" class="btn">Accéder au CRM</a>
    </div>
    <div class="footer">© 2025 CRM — Notification automatique</div>
  </div>
</body>
</html>`
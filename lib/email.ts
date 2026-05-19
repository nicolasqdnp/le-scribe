const BREVO_API = 'https://api.brevo.com/v3/smtp/email'
const FROM = { name: 'Le Scribe', email: 'noreply@lescribe.app' }

// ─── Envoi générique ───────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) { console.error('[email] BREVO_API_KEY manquant'); return }

  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: FROM,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[email] Brevo error:', err)
  }
}

// ─── Template de base ──────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; background: #0d0c0a; font-family: Georgia, serif; color: #e8e0d0; }
    .wrap { max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .logo { font-size: 22px; font-weight: bold; color: #c9a77d; margin-bottom: 32px; }
    .card { background: #1a1814; border: 1px solid #2a2520; border-radius: 16px; padding: 36px; }
    h1 { font-size: 22px; color: #f0ead8; margin: 0 0 12px; }
    p { font-size: 15px; line-height: 1.7; color: #a09070; margin: 0 0 16px; }
    .btn { display: inline-block; background: #c9a77d; color: #0d0c0a; font-weight: bold;
           font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none;
           margin: 8px 0 20px; }
    .footer { margin-top: 32px; font-size: 12px; color: #5a5040; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="logo">Le Scribe</div>
    <div class="card">${content}</div>
    <div class="footer">
      Le Scribe · Aide les pasteurs et prédicateurs à écrire leurs livres<br/>
      <a href="https://lescribe.app" style="color:#c9a77d;">lescribe.app</a>
    </div>
  </div>
</body>
</html>`
}

// ─── Email : Bienvenue ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, prenom: string) {
  try {
    await sendEmail(
      to,
      'Bienvenue sur Le Scribe 🖊',
      baseTemplate(`
        <h1>Bienvenue, ${prenom || 'Auteur'} !</h1>
        <p>Tu viens de rejoindre Le Scribe — l'assistant IA qui aide les pasteurs et prédicateurs à écrire leurs livres dans leur propre style.</p>
        <p>Pour commencer, crée ton profil auteur. L'IA analysera ton style de prédication pour écrire exactement comme toi.</p>
        <a href="https://lescribe.app/profil" class="btn">Créer mon profil auteur →</a>
        <p>Si tu as des questions, réponds directement à cet email — je lis chaque message.</p>
        <p style="color:#c9a77d;">Nicolas<br/><span style="color:#a09070;font-size:13px;">Fondateur de Le Scribe</span></p>
      `)
    )
  } catch (e) {
    console.error('[email] sendWelcomeEmail error:', e)
  }
}

// ─── Email : Paiement confirmé ─────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  livre:   'Par livre (1 livre, chapitres illimités)',
  forfait: 'Forfait 5 livres (3 mois)',
  premium: 'Premium (illimité)',
}

export async function sendPaymentConfirmationEmail(to: string, prenom: string, plan: string) {
  try {
    await sendEmail(
      to,
      '✓ Paiement confirmé — Le Scribe',
      baseTemplate(`
        <h1>Paiement confirmé ✓</h1>
        <p>Merci ${prenom || ''} ! Ton accès <strong style="color:#c9a77d;">${PLAN_LABELS[plan] || plan}</strong> est maintenant actif.</p>
        <p>Tu peux désormais générer tous tes chapitres, exporter ton livre en DOCX et utiliser toutes les fonctionnalités du Scribe.</p>
        <a href="https://lescribe.app/dashboard" class="btn">Aller à mon tableau de bord →</a>
        <p>Bonne écriture !</p>
        <p style="color:#c9a77d;">Nicolas<br/><span style="color:#a09070;font-size:13px;">Fondateur de Le Scribe</span></p>
      `)
    )
  } catch (e) {
    console.error('[email] sendPaymentConfirmationEmail error:', e)
  }
}

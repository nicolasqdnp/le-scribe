import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Le Scribe <noreply@lescribe.app>'

// ─── Templates ────────────────────────────────────────────────────────────────

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
  if (!process.env.RESEND_API_KEY) return
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Bienvenue sur Le Scribe 🖊',
      html: baseTemplate(`
        <h1>Bienvenue, ${prenom || 'Auteur'} !</h1>
        <p>Tu viens de rejoindre Le Scribe — l'assistant IA qui aide les pasteurs et prédicateurs à écrire leurs livres dans leur propre style.</p>
        <p>Pour commencer, crée ton profil auteur. L'IA analysera ton style de prédication pour écrire exactement comme toi.</p>
        <a href="https://lescribe.app/profil" class="btn">Créer mon profil auteur →</a>
        <p>Si tu as des questions, réponds directement à cet email — je lis chaque message.</p>
        <p style="color:#c9a77d;">Nicolas<br/><span style="color:#a09070;font-size:13px;">Fondateur de Le Scribe</span></p>
      `),
    })
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
  if (!process.env.RESEND_API_KEY) return
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: '✓ Paiement confirmé — Le Scribe',
      html: baseTemplate(`
        <h1>Paiement confirmé ✓</h1>
        <p>Merci ${prenom || ''} ! Ton accès <strong style="color:#c9a77d;">${PLAN_LABELS[plan] || plan}</strong> est maintenant actif.</p>
        <p>Tu peux désormais générer tous tes chapitres, exporter ton livre en DOCX et utiliser toutes les fonctionnalités du Scribe.</p>
        <a href="https://lescribe.app/dashboard" class="btn">Aller à mon tableau de bord →</a>
        <p>Bonne écriture !</p>
        <p style="color:#c9a77d;">Nicolas<br/><span style="color:#a09070;font-size:13px;">Fondateur de Le Scribe</span></p>
      `),
    })
  } catch (e) {
    console.error('[email] sendPaymentConfirmationEmail error:', e)
  }
}

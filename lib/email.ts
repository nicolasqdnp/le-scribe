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

// ─── Email : EPUB livré ────────────────────────────────────────────────────────

export async function sendEpubEmail(to: string, downloadUrl: string) {
  try {
    await sendEmail(
      to,
      '📖 Votre livre est prêt — L\'urgence des temps',
      baseTemplate(`
        <h1>Merci pour votre achat !</h1>
        <p>Votre exemplaire numérique de <strong style="color:#c9a77d;">L'urgence des temps</strong>
        par Nicolas Salafranque est prêt à être téléchargé.</p>
        <a href="${downloadUrl}" class="btn">Télécharger mon EPUB →</a>
        <p style="font-size:13px;color:#7a6a50;">Ce lien est valable 48 heures. Si vous ne parvenez pas à télécharger le fichier, répondez à cet email.</p>

        <div style="margin:28px 0 0;padding:20px;background:#13120f;border-radius:12px;border:1px solid #2a2520;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#c9a77d;">📱 Lire sur une liseuse Kindle ?</p>
          <p style="margin:0 0 16px;font-size:13px;color:#7a6a50;">Kindle ne lit pas directement les EPUB — voici deux façons simples de l'y envoyer :</p>

          <p style="margin:0 0 4px;font-size:13px;color:#e8e0d0;font-weight:bold;">Depuis votre téléphone</p>
          <p style="margin:0 0 4px;font-size:13px;color:#7a6a50;">1. Téléchargez l'EPUB sur votre téléphone (bouton ci-dessus)</p>
          <p style="margin:0 0 4px;font-size:13px;color:#7a6a50;">2. Installez l'app <strong style="color:#e8e0d0;">Send to Kindle</strong> si besoin :
            &nbsp;<a href="https://apps.apple.com/app/send-to-kindle/id1626238021" style="color:#c9a77d;">App Store</a>
            &nbsp;·&nbsp;<a href="https://play.google.com/store/apps/details?id=com.amazon.sendtokindle" style="color:#c9a77d;">Google Play</a>
          </p>
          <p style="margin:0 0 18px;font-size:13px;color:#7a6a50;">3. Ouvrez le fichier → "Partager" → <em>Send to Kindle</em></p>

          <p style="margin:0 0 4px;font-size:13px;color:#e8e0d0;font-weight:bold;">Depuis un ordinateur</p>
          <p style="margin:0 0 4px;font-size:13px;color:#7a6a50;">1. Téléchargez l'EPUB sur votre ordinateur (bouton ci-dessus)</p>
          <p style="margin:0 0 4px;font-size:13px;color:#7a6a50;">2. Allez sur <a href="https://send.amazon.com" style="color:#c9a77d;">send.amazon.com</a></p>
          <p style="margin:0 0 18px;font-size:13px;color:#7a6a50;">3. Uploadez le fichier → il apparaît dans votre bibliothèque Kindle</p>

          <a href="https://send.amazon.com" style="display:inline-block;background:#1a1814;color:#c9a77d;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:8px;border:1px solid #3a2f20;text-decoration:none;">
            Ouvrir Send to Kindle →
          </a>
        </div>

        <p style="margin-top:24px;">Bonne lecture !</p>
        <p style="color:#c9a77d;">Nicolas Salafranque<br/>
        <span style="color:#a09070;font-size:13px;">Pasteur · Auteur · Fondateur des Éditions Le Scribe</span></p>
      `)
    )
  } catch (e) {
    console.error('[email] sendEpubEmail error:', e)
  }
}

// ─── Email : Précommande physique confirmée ─────────────────────────────────────

export async function sendPhysiqueConfirmationEmail(to: string, shippingName: string) {
  try {
    await sendEmail(
      to,
      '✓ Précommande confirmée — L\'urgence des temps',
      baseTemplate(`
        <h1>Précommande confirmée ✓</h1>
        <p>Merci ${shippingName || ''} ! Votre précommande de <strong style="color:#c9a77d;">L'urgence des temps</strong>
        (édition papier) a bien été enregistrée.</p>
        <p>Dès que l'impression est disponible, votre livre vous sera expédié à l'adresse indiquée. Vous recevrez un email de confirmation d'expédition.</p>
        <p style="font-size:13px;color:#7a6a50;">Pour toute question, répondez à cet email.</p>
        <p>Merci pour votre confiance !</p>
        <p style="color:#c9a77d;">Nicolas Salafranque<br/>
        <span style="color:#a09070;font-size:13px;">Pasteur · Auteur · Éditions Le Scribe</span></p>
      `)
    )
  } catch (e) {
    console.error('[email] sendPhysiqueConfirmationEmail error:', e)
  }
}

// ─── Email : Confirmation contribution campagne ────────────────────────────────

const TIER_LABELS_EMAIL: Record<string, string> = {
  merci:     'Soutien — Un grand merci',
  ebook:     "L'urgence des temps — EPUB",
  livre:     'Le livre — tarif lancement',
  dedicace:  'Le livre dédicacé',
  echange:   'Le livre + un échange',
  pack3:     'Pack de 3 — à offrir',
  eglise:    'Le pack Église (10 ex.)',
  don_libre: 'Don libre',
}

export async function sendCampaignConfirmationEmail(to: string, tierId: string) {
  try {
    const tierLabel = TIER_LABELS_EMAIL[tierId] || tierId
    const isPhysique = ['livre', 'dedicace', 'echange', 'pack3', 'eglise'].includes(tierId)

    await sendEmail(
      to,
      '✓ Contribution confirmée — L\'urgence des temps',
      baseTemplate(`
        <h1>Merci pour ta contribution !</h1>
        <p>Ta contribution à la campagne de financement de <strong style="color:#c9a77d;">L'urgence des temps</strong>
        a bien été enregistrée.</p>
        <p style="font-size:13px;color:#7a6a50;">Palier choisi : ${tierLabel}</p>
        ${isPhysique
          ? `<p>Ton livre sera expédié dès que le tirage est imprimé, à l'été 2026. Tu recevras un email de confirmation d'expédition à ce moment-là.</p>`
          : `<p>Ta générosité rend ce projet possible. Merci du fond du cœur.</p>`
        }
        <p style="font-size:13px;color:#7a6a50;">Pour toute question, réponds directement à cet email.</p>
        <p style="color:#c9a77d;">Nicolas Salafranque<br/>
        <span style="color:#a09070;font-size:13px;">Pasteur · Auteur · Éditions Le Scribe</span></p>
      `)
    )
  } catch (e) {
    console.error('[email] sendCampaignConfirmationEmail error:', e)
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

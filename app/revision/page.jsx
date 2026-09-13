import Link from 'next/link'

export const metadata = {
  title: 'Un mot de l\'auteur — L\'urgence des temps',
  description: 'Le chapitre 14 de « L\'urgence des temps » a été entièrement révisé. Lisez l\'explication de l\'auteur et téléchargez gratuitement l\'édition numérique révisée.',
}

export default function RevisionPage() {
  return (
    <main style={{ margin: 0, background: '#0d0c0a', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#e8e0d0' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px 64px' }}>

        {/* Logo */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', color: '#c9a77d', textDecoration: 'none' }}>
            Le Scribe
          </Link>
        </div>

        {/* Carte */}
        <div style={{ background: '#1a1814', border: '1px solid #2a2520', borderRadius: '20px', padding: '44px 40px' }}>

          <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#c9a77d', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 20px' }}>
            Un mot de l'auteur
          </p>

          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 'bold', color: '#f0ead8', margin: '0 0 28px', lineHeight: 1.3 }}>
            L'urgence des temps<br />
            <span style={{ fontSize: '16px', color: '#a09070', fontWeight: 'normal' }}>Note sur la révision du chapitre 14</span>
          </h1>

          <div style={{ fontSize: '16px', lineHeight: 1.8, color: '#c8bfa8' }}>
            <p style={{ margin: '0 0 20px' }}>
              Vous tenez entre les mains la première édition de <em>« L'urgence des temps »</em>.
              Depuis son impression, j'ai entièrement réécrit le chapitre 14.
            </p>
            <p style={{ margin: '0 0 20px' }}>
              En poursuivant mes recherches, j'ai découvert que l'un des arguments de ma chronologie
              ne tenait pas à l'examen. Je l'ai retiré, et le chapitre a été profondément retravaillé
              pour être plus solide, plus honnête, et plus utile.
            </p>
            <p style={{ margin: '0 0 20px' }}>
              Je préfère corriger un livre que défendre une erreur.
            </p>
            <p style={{ margin: '0 0 32px' }}>
              Pour cette raison, je vous offre gratuitement l'édition numérique révisée.
              Elle contient le chapitre 14 dans sa version définitive.
            </p>
          </div>

          {/* Bouton téléchargement */}
          <a
            href="/api/revision-epub"
            style={{
              display: 'block',
              background: '#c9a77d',
              color: '#0d0c0a',
              fontWeight: 'bold',
              fontSize: '15px',
              padding: '16px 28px',
              borderRadius: '12px',
              textDecoration: 'none',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            📖 Télécharger l'édition révisée (EPUB) →
          </a>

          <p style={{ fontSize: '12px', color: '#5a5040', textAlign: 'center', margin: '0 0 36px' }}>
            Format EPUB · Fonctionne sur toutes les liseuses et applis de lecture
          </p>

          {/* Kindle */}
          <div style={{ background: '#13120f', border: '1px solid #2a2520', borderRadius: '12px', padding: '20px 24px', marginBottom: '36px' }}>
            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#c9a77d', margin: '0 0 8px' }}>📱 Vous lisez sur Kindle ?</p>
            <p style={{ fontSize: '13px', color: '#7a6a50', margin: '0 0 4px' }}>
              Téléchargez l'EPUB, puis envoyez-le à votre liseuse via l'application{' '}
              <strong style={{ color: '#e8e0d0' }}>Send to Kindle</strong> (
              <a href="https://apps.apple.com/app/send-to-kindle/id1626238021" style={{ color: '#c9a77d' }}>App Store</a>
              {' · '}
              <a href="https://play.google.com/store/apps/details?id=com.amazon.sendtokindle" style={{ color: '#c9a77d' }}>Google Play</a>
              ) ou depuis{' '}
              <a href="https://send.amazon.com" style={{ color: '#c9a77d' }}>send.amazon.com</a>.
            </p>
          </div>

          {/* Signature */}
          <p style={{ fontSize: '15px', color: '#c9a77d', margin: '0 0 4px' }}>Nicolas Salafranque</p>
          <p style={{ fontSize: '13px', color: '#7a6a50', margin: 0 }}>Pasteur · Auteur · Éditions Le Scribe</p>
        </div>

        {/* Footer */}
        <p style={{ marginTop: '32px', fontSize: '12px', color: '#3a3228', textAlign: 'center' }}>
          © 2025 Éditions Le Scribe ·{' '}
          <a href="https://lescribe.app" style={{ color: '#5a4a38' }}>lescribe.app</a>
        </p>
      </div>
    </main>
  )
}

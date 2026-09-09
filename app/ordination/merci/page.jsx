'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function MerciContent() {
  const params  = useSearchParams()
  const montant = params.get('montant')

  return (
    <main style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% -10%, rgba(196,120,158,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(212,175,122,0.10) 0%, transparent 55%), #130910', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      <header style={{ borderBottom: '1px solid #3a1a2c', padding: '16px 24px' }}>
        <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#d4af7a' }}>
          Le Scribe
        </span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>

          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🙏</div>

          <p style={{ fontSize: '13px', color: '#d4a0b8', letterSpacing: '0.4em', marginBottom: '16px', opacity: 0.7 }}>
            ✦ &nbsp; ✦ &nbsp; ✦
          </p>

          <h1 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '28px', fontWeight: 700, lineHeight: 1.3, marginBottom: '20px',
            background: 'linear-gradient(135deg, #f7ede8 30%, #d4a0b8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Merci pour ton geste !
          </h1>

          <p style={{ fontSize: '15px', color: '#b08898', lineHeight: 1.85, marginBottom: '8px' }}>
            {montant ? `Ton don de ${montant} € a bien été reçu.` : 'Ton don a bien été reçu.'}
          </p>
          <p style={{ fontSize: '15px', color: '#b08898', lineHeight: 1.85, marginBottom: '36px' }}>
            Que le Seigneur te bénisse pour ta générosité.<br />Un reçu t'a été envoyé par email.
          </p>

          <div style={{
            background: '#1e0d18', border: '1px solid #3a1a2c',
            borderRadius: '16px', padding: '24px 28px', marginBottom: '36px',
          }}>
            <p style={{ fontSize: '14px', color: '#b08898', lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
              « Que celui qui sème généreusement moissonnera aussi généreusement. »
            </p>
            <p style={{ fontSize: '12px', color: '#6a445a', marginTop: '10px', marginBottom: 0 }}>
              2 Corinthiens 9:6
            </p>
          </div>

          <a
            href="/"
            style={{
              display: 'inline-block', padding: '11px 28px', borderRadius: '10px',
              border: '1.5px solid #3a1a2c', color: '#6a445a', fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            ← Retour au site
          </a>
        </div>
      </div>
    </main>
  )
}

export default function OrdinationMerciPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#130910', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6a445a' }}>Chargement…</p>
      </main>
    }>
      <MerciContent />
    </Suspense>
  )
}

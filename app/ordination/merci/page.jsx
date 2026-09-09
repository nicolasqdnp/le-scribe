'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function MerciContent() {
  const params = useSearchParams()
  const montant = params.get('montant')

  return (
    <main style={{ minHeight: '100vh', background: '#0a0905', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      <header style={{ borderBottom: '1px solid #2a2518', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#c9a77d' }}>
          Le Scribe
        </span>
        <span style={{ fontSize: '12px', color: '#6b6355', letterSpacing: '0.08em' }}>CÉRÉMONIE PRIVÉE</span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>

          <div style={{ fontSize: '52px', marginBottom: '24px' }}>🙏</div>

          <h1 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '28px',
            fontWeight: 700,
            color: '#ede8df',
            lineHeight: 1.3,
            marginBottom: '16px',
          }}>
            Merci pour ton geste !
          </h1>

          <p style={{ fontSize: '15px', color: '#c8c3bb', lineHeight: 1.8, marginBottom: '12px' }}>
            {montant
              ? `Ton don de ${montant} € a bien été reçu.`
              : 'Ton don a bien été reçu.'}
          </p>
          <p style={{ fontSize: '15px', color: '#c8c3bb', lineHeight: 1.8, marginBottom: '32px' }}>
            Que le Seigneur te bénisse pour ta générosité. Un reçu t'a été envoyé par email.
          </p>

          <div style={{
            background: '#111009',
            border: '1px solid #2a2518',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}>
            <p style={{ fontSize: '14px', color: '#9a9080', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              « Que celui qui sème généreusement moissonnera aussi généreusement. »
            </p>
            <p style={{ fontSize: '12px', color: '#6b6355', marginTop: '8px', margin: '8px 0 0' }}>
              2 Corinthiens 9:6
            </p>
          </div>

          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: '10px',
              border: '1.5px solid #2a2518',
              color: '#9a9080',
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'border-color 0.15s',
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
      <main style={{ minHeight: '100vh', background: '#0a0905', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b6355' }}>Chargement…</p>
      </main>
    }>
      <MerciContent />
    </Suspense>
  )
}

'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const TIER_LABELS = {
  merci:     'Soutien — Un grand merci',
  ebook:     "L'urgence des temps — EPUB",
  livre:     "L'urgence des temps — Livre (tarif lancement)",
  dedicace:  "L'urgence des temps — Livre dédicacé",
  echange:   "L'urgence des temps — Livre + échange",
  pack3:     "L'urgence des temps — Pack de 3",
  eglise:    "L'urgence des temps — Pack Église",
  don_libre: 'Don libre',
}

function MerciContent() {
  const params = useSearchParams()
  const tier = params.get('tier') || ''

  const isEbook    = tier === 'ebook'
  const isDon      = tier === 'merci' || tier === 'don_libre'
  const isPhysique = !isEbook && !isDon

  const emoji = isEbook ? '📖' : isDon ? '🙏' : '📦'
  const titre = isEbook
    ? 'Merci pour ta contribution !'
    : isDon
    ? 'Merci pour ton soutien !'
    : 'Contribution confirmée !'

  const message = isEbook
    ? "Tu vas recevoir ton EPUB par email dans quelques minutes. Pense à vérifier tes spams si tu ne le reçois pas."
    : isDon
    ? "Ta générosité rend ce projet possible. Merci du fond du cœur — ton nom figurera sur la page des soutiens du site."
    : "Ton livre sera expédié dès que le tirage est imprimé, à l'été 2026. Tu recevras un email de confirmation d'expédition."

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #252525', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/campagne" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#c9a77d', textDecoration: 'none' }}>
          Le Scribe
        </a>
        <span style={{ fontSize: '12px', color: '#7a7570' }}>Éditions Le Scribe</span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '24px' }}>{emoji}</div>

          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '28px', fontWeight: 700, color: '#ede8df', marginBottom: '16px', lineHeight: 1.3 }}>
            {titre}
          </h1>

          <p style={{ fontSize: '15px', color: '#c8c3bb', lineHeight: 1.7, marginBottom: '32px' }}>
            {message}
          </p>

          {/* Récap */}
          <div style={{ background: '#111', border: '1px solid #252525', borderRadius: '16px', padding: '20px', marginBottom: '32px', textAlign: 'left' }}>
            <p style={{ fontSize: '11px', color: '#7a7570', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '12px' }}>
              Ta contribution
            </p>
            <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '17px', fontWeight: 700, color: '#ede8df', marginBottom: '4px' }}>
              L'urgence des temps
            </p>
            <p style={{ fontSize: '13px', color: '#c9a77d', marginBottom: '4px' }}>
              {TIER_LABELS[tier] || tier}
            </p>
            <p style={{ fontSize: '12px', color: '#7a7570' }}>
              Nicolas Salafranque · Éditions Le Scribe
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a
              href="/campagne"
              style={{ background: '#c9a77d', color: '#0d0d0d', fontWeight: 700, fontSize: '14px', padding: '14px 24px', borderRadius: '12px', textDecoration: 'none', display: 'block' }}>
              ← Retour à la campagne
            </a>
            <a
              href="https://lescribe.app"
              style={{ fontSize: '13px', color: '#7a7570', textDecoration: 'none' }}>
              Découvrir Le Scribe →
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function MerciPage() {
  return (
    <Suspense>
      <MerciContent />
    </Suspense>
  )
}

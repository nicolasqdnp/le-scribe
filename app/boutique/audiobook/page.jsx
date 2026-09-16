'use client'
import { useState } from 'react'

export default function AudiobookPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleBuy(e) {
    e.preventDefault()
    setError('')
    if (!email || !email.includes('@')) { setError('Email invalide'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout-livre', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product: 'audio', email, delivery: 'postal' }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) { setError(data.error || 'Erreur'); return }
      window.location.href = data.url
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: { background: '#0d0c0a', minHeight: '100vh', color: '#e8e0d0', fontFamily: 'Georgia, serif' },
    wrap: { maxWidth: '600px', margin: '0 auto', padding: '48px 24px 80px' },
    logo: { fontSize: '20px', fontWeight: 'bold', color: '#c9a77d', marginBottom: '40px', display: 'block', textDecoration: 'none' },
    card: { background: '#1a1814', border: '1px solid #2a2520', borderRadius: '20px', padding: '40px' },
    badge: { fontSize: '11px', fontWeight: 'bold', color: '#c9a77d', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px', display: 'block' },
    h1: { fontSize: '26px', fontWeight: 'bold', color: '#f0ead8', margin: '0 0 6px', lineHeight: 1.3 },
    author: { fontSize: '14px', color: '#7a6a50', margin: '0 0 28px' },
    price: { fontSize: '36px', fontWeight: 'bold', color: '#c9a77d', margin: '0 0 4px' },
    priceSub: { fontSize: '13px', color: '#5a4a38', margin: '0 0 28px' },
    divider: { border: 'none', borderTop: '1px solid #2a2520', margin: '28px 0' },
    feature: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' },
    featureIcon: { fontSize: '16px', minWidth: '20px', marginTop: '2px' },
    featureText: { fontSize: '14px', color: '#a09070', lineHeight: 1.5 },
    input: { width: '100%', boxSizing: 'border-box', background: '#13120f', border: '1px solid #3a3228', borderRadius: '10px', padding: '14px 16px', fontSize: '15px', color: '#e8e0d0', outline: 'none', marginBottom: '12px' },
    btn: { width: '100%', background: '#c9a77d', color: '#0d0c0a', fontWeight: 'bold', fontSize: '15px', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer' },
    err: { color: '#c0392b', fontSize: '14px', marginBottom: '12px' },
  }

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <a href="/" style={s.logo}>Le Scribe</a>
        <div style={s.card}>
          <span style={s.badge}>🎧 Audiobook</span>
          <h1 style={s.h1}>L'urgence des temps</h1>
          <p style={s.author}>Nicolas Salafranque — Éditions Le Scribe</p>

          <p style={s.price}>9,90 €</p>
          <p style={s.priceSub}>Accès à vie · Streaming + téléchargement</p>

          <hr style={s.divider} />

          <div style={{ marginBottom: '28px' }}>
            {[
              ['🎙', 'Lu par l\'auteur · Voix Remy (Microsoft Neural TTS)'],
              ['⏱', '3h32 d\'écoute · 25 chapitres numérotés'],
              ['📱', 'Streaming sur le site ou téléchargement M4B (iPhone, Mac, VLC…)'],
              ['♾', 'Accès permanent — revenez quand vous le souhaitez'],
            ].map(([icon, text], i) => (
              <div key={i} style={s.feature}>
                <span style={s.featureIcon}>{icon}</span>
                <span style={s.featureText}>{text}</span>
              </div>
            ))}
          </div>

          <hr style={s.divider} />

          <form onSubmit={handleBuy}>
            <p style={{ fontSize: '14px', color: '#7a6a50', margin: '0 0 12px' }}>
              Votre email (pour accéder à l'audiobook après paiement)
            </p>
            <input
              type="email" required
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input}
            />
            {error && <p style={s.err}>{error}</p>}
            <button type="submit" disabled={loading} style={s.btn}>
              {loading ? 'Redirection…' : '🎧 Acheter l\'audiobook — 9,90 €'}
            </button>
          </form>

          <p style={{ marginTop: '16px', fontSize: '12px', color: '#3a3228', textAlign: 'center' }}>
            Paiement sécurisé · Carte, Apple Pay, Google Pay
          </p>
        </div>

        <p style={{ marginTop: '32px', fontSize: '12px', color: '#3a3228', textAlign: 'center' }}>
          Vous avez déjà l'audiobook ?{' '}
          <a href="/mon-audiobook" style={{ color: '#5a4a38' }}>Accéder →</a>
        </p>
      </div>
    </main>
  )
}

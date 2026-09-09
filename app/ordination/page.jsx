'use client'
import { useState } from 'react'

const MONTANTS = [20, 50, 100, 200]

// Palette rose poudré & doré
const C = {
  bg:          '#130910',
  bgGlow:      'radial-gradient(ellipse at 50% -10%, rgba(196,120,158,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(212,175,122,0.10) 0%, transparent 55%), #130910',
  border:      '#3a1a2c',
  borderActive:'#c9a0b8',
  surface:     '#1e0d18',
  rose:        '#d4a0b8',
  gold:        '#d4af7a',
  text:        '#f7ede8',
  muted:       '#b08898',
  faint:       '#6a445a',
  btnBg:       'linear-gradient(135deg, #c9a0b8 0%, #d4af7a 100%)',
  btnBgOff:    '#3a1a2c',
  error:       '#e07878',
}

export default function OrdinationPage() {
  const [montant, setMontant]         = useState(50)
  const [montantLibre, setMontantLibre] = useState('')
  const [modeLibre, setModeLibre]     = useState(false)
  const [email, setEmail]             = useState('')
  const [nom, setNom]                 = useState('')
  const [loading, setLoading]         = useState(false)
  const [erreur, setErreur]           = useState('')

  const montantFinal = modeLibre ? parseInt(montantLibre || '0', 10) : montant

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    if (!email)                              { setErreur('Merci de renseigner ton adresse email.'); return }
    if (!montantFinal || montantFinal < 5)   { setErreur('Le montant minimum est de 5 €.'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/checkout-ordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: montantFinal, name: nom }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url }
      else          { setErreur(data.error || 'Une erreur est survenue.') }
    } catch {
      setErreur('Une erreur est survenue. Réessaie dans un instant.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: `1.5px solid ${C.border}`, background: C.surface,
    color: C.text, fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
  }

  return (
    <main style={{ minHeight: '100vh', background: C.bgGlow, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px' }}>
        <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: C.gold }}>
          Le Scribe
        </span>
      </header>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '52px 24px 80px' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>

          {/* Photo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '136px', height: '136px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
              background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
              padding: '2px',
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: C.surface }}>
                <img
                  src="/audrey.jpeg"
                  alt="Audrey Salafranque"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Titre */}
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>

            {/* Étoiles déco */}
            <p style={{ fontSize: '13px', color: C.rose, letterSpacing: '0.4em', marginBottom: '16px', opacity: 0.7 }}>
              ✦ &nbsp; ✦ &nbsp; ✦
            </p>

            <h1 style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: '30px', fontWeight: 700, lineHeight: 1.25,
              marginBottom: '10px',
              background: `linear-gradient(135deg, ${C.text} 30%, ${C.rose} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Audrey Salafranque
            </h1>

            <p style={{ fontSize: '12px', color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Ordination · Prophète
            </p>
            <p style={{ fontSize: '13px', color: C.faint, letterSpacing: '0.06em', marginBottom: '28px' }}>
              27 septembre 2026
            </p>

            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.85, maxWidth: '390px', margin: '0 auto' }}>
              Si tu as à cœur de marquer ce moment, tu peux participer à l'enveloppe de soutien — un geste simple, si tu le souhaites, pour exprimer ton affection et ta bénédiction pour Audrey.
            </p>
          </div>

          {/* Séparateur */}
          <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${C.border}, transparent)`, marginBottom: '36px' }} />

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>

            {/* Montants */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: C.faint, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Montant
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {MONTANTS.map(m => {
                  const active = !modeLibre && montant === m
                  return (
                    <button
                      key={m} type="button"
                      onClick={() => { setMontant(m); setModeLibre(false); setMontantLibre('') }}
                      style={{
                        padding: '13px 8px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        border: active ? `1.5px solid ${C.rose}` : `1.5px solid ${C.border}`,
                        background: active ? 'rgba(212,160,184,0.12)' : C.surface,
                        color: active ? C.rose : C.faint,
                      }}
                    >
                      {m} €
                    </button>
                  )
                })}
              </div>

              {/* Montant libre */}
              <div
                onClick={() => setModeLibre(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 16px', borderRadius: '10px', cursor: 'text',
                  border: modeLibre ? `1.5px solid ${C.rose}` : `1.5px solid ${C.border}`,
                  background: modeLibre ? 'rgba(212,160,184,0.08)' : C.surface,
                }}
              >
                <span style={{ fontSize: '13px', color: C.faint }}>Autre montant :</span>
                <input
                  type="number" min="5" placeholder="ex. 75"
                  value={montantLibre}
                  onChange={e => { setMontantLibre(e.target.value); setModeLibre(true) }}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', fontWeight: 600, color: C.text, fontFamily: 'system-ui, sans-serif' }}
                />
                <span style={{ fontSize: '13px', color: C.faint }}>€</span>
              </div>
            </div>

            {/* Nom */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: C.faint, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Ton prénom (optionnel)
              </label>
              <input type="text" placeholder="Pour personnaliser le reçu" value={nom} onChange={e => setNom(e.target.value)} style={inputStyle} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: C.faint, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Ton adresse email *
              </label>
              <input type="email" required placeholder="pour le reçu de paiement" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>

            {/* Erreur */}
            {erreur && (
              <p style={{ fontSize: '14px', color: C.error, marginBottom: '16px', textAlign: 'center' }}>{erreur}</p>
            )}

            {/* Bouton */}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
                background: loading ? C.btnBgOff : C.btnBg,
                color: loading ? C.faint : '#130910',
                fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em', transition: 'opacity 0.15s',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {loading ? 'Redirection…' : `Offrir ${montantFinal || '…'} € →`}
            </button>

            <p style={{ fontSize: '11px', color: C.faint, textAlign: 'center', marginTop: '14px', lineHeight: 1.7, letterSpacing: '0.02em' }}>
              Paiement sécurisé par Stripe · Carte bancaire, Apple Pay, Google Pay
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

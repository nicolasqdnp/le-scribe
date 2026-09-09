'use client'
import { useState } from 'react'

const MONTANTS = [20, 50, 100, 200]

export default function OrdinationPage() {
  const [montant, setMontant] = useState(50)
  const [montantLibre, setMontantLibre] = useState('')
  const [modeLibre, setModeLibre] = useState(false)
  const [email, setEmail] = useState('')
  const [nom, setNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const montantFinal = modeLibre ? parseInt(montantLibre || '0', 10) : montant

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')

    if (!email) { setErreur('Merci de renseigner ton adresse email.'); return }
    if (!montantFinal || montantFinal < 5) { setErreur('Le montant minimum est de 5 €.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout-ordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: montantFinal, name: nom }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setErreur(data.error || 'Une erreur est survenue.')
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie dans un instant.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0905', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #2a2518', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#c9a77d' }}>
          Le Scribe
        </span>
        <span style={{ fontSize: '12px', color: '#6b6355', letterSpacing: '0.08em' }}>CÉRÉMONIE PRIVÉE</span>
      </header>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: '520px', width: '100%' }}>

          {/* Photo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #c9a77d',
              background: '#1a160e',
              flexShrink: 0,
            }}>
              <img
                src="/audrey.jpg"
                alt="Audrey Salafranque"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none' }}
              />
            </div>
          </div>

          {/* En-tête de la page */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: '28px',
              fontWeight: 700,
              color: '#ede8df',
              lineHeight: 1.3,
              marginBottom: '10px',
            }}>
              Audrey Salafranque
            </h1>
            <p style={{ fontSize: '13px', color: '#c9a77d', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
              Ordination · Prophète
            </p>
            <p style={{ fontSize: '13px', color: '#6b6355', letterSpacing: '0.08em', marginBottom: '28px' }}>
              27 septembre 2026
            </p>
            <p style={{ fontSize: '15px', color: '#c8c3bb', lineHeight: 1.8, maxWidth: '400px', margin: '0 auto' }}>
              Si tu as à cœur de marquer ce moment, tu peux participer à l'enveloppe de soutien — un geste simple, si tu le souhaites, pour exprimer ton affection et ta bénédiction pour Audrey.
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>

            {/* Montants prédéfinis */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b6355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Montant
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {MONTANTS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMontant(m); setModeLibre(false); setMontantLibre('') }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '10px',
                      border: (!modeLibre && montant === m) ? '1.5px solid #c9a77d' : '1.5px solid #2a2518',
                      background: (!modeLibre && montant === m) ? 'rgba(201,167,125,0.08)' : '#111009',
                      color: (!modeLibre && montant === m) ? '#c9a77d' : '#9a9080',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m} €
                  </button>
                ))}
              </div>
              {/* Montant libre */}
              <div
                onClick={() => setModeLibre(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: modeLibre ? '1.5px solid #c9a77d' : '1.5px solid #2a2518',
                  background: modeLibre ? 'rgba(201,167,125,0.06)' : '#111009',
                  cursor: 'text',
                }}
              >
                <span style={{ fontSize: '14px', color: '#6b6355' }}>Autre montant :</span>
                <input
                  type="number"
                  min="5"
                  placeholder="ex. 75"
                  value={montantLibre}
                  onChange={e => { setMontantLibre(e.target.value); setModeLibre(true) }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#ede8df',
                  }}
                />
                <span style={{ fontSize: '14px', color: '#6b6355' }}>€</span>
              </div>
            </div>

            {/* Nom (optionnel) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b6355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Ton prénom (optionnel)
              </label>
              <input
                type="text"
                placeholder="Pour personnaliser le reçu"
                value={nom}
                onChange={e => setNom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #2a2518',
                  background: '#111009',
                  color: '#ede8df',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6b6355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Ton adresse email *
              </label>
              <input
                type="email"
                required
                placeholder="pour le reçu de paiement"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #2a2518',
                  background: '#111009',
                  color: '#ede8df',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Erreur */}
            {erreur && (
              <p style={{ fontSize: '14px', color: '#e07070', marginBottom: '16px', textAlign: 'center' }}>
                {erreur}
              </p>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                background: loading ? '#4a3d2a' : '#c9a77d',
                color: '#0a0905',
                fontSize: '16px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Redirection…' : `Offrir ${montantFinal || '…'} €  →`}
            </button>

            <p style={{ fontSize: '12px', color: '#4a4438', textAlign: 'center', marginTop: '16px', lineHeight: 1.6 }}>
              Paiement sécurisé par Stripe · Carte bancaire, Apple Pay, Google Pay
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

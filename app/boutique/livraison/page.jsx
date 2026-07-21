'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const PRODUCTS = {
  livre:  { label: 'Livre physique',              priceStr: '18,99€', relayStr: '3,90€' },
  pack3:  { label: 'Pack 3 exemplaires',          priceStr: '48€',    relayStr: '5,50€' },
  pack10: { label: 'Pack Église 10 exemplaires',  priceStr: '140€',   relayStr: '9€'    },
}

function LivraisonForm() {
  const params = useSearchParams()
  const router = useRouter()
  const product = params.get('product')
  const email   = params.get('email')

  const info = PRODUCTS[product]

  const [mode, setMode]             = useState(null) // 'relay' | 'pickup'
  const [relayPoint, setRelayPoint] = useState(null)
  const [relayZip, setRelayZip]     = useState('')
  const [relayList, setRelayList]   = useState([])
  const [relayLoading, setRelayLoading] = useState(false)
  const [relayError, setRelayError] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    setRelayPoint(null); setRelayList([]); setRelayZip(''); setRelayError('')
  }, [mode])

  if (!info || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cream">
        <p>Lien invalide. <a href="/boutique" className="text-gold underline">Retour à la boutique</a></p>
      </div>
    )
  }

  async function searchRelayPoints(zip) {
    if (!/^\d{5}$/.test(zip)) return
    setRelayLoading(true); setRelayError(''); setRelayList([])
    try {
      const res  = await fetch(`/api/parcel-points?zipCode=${zip}`)
      const data = await res.json()
      if (!res.ok || data.error) { setRelayError('Aucun point trouvé pour ce code postal.'); return }
      setRelayList(data)
    } catch { setRelayError('Erreur réseau. Réessaie.') }
    finally  { setRelayLoading(false) }
  }

  async function confirm() {
    if (mode === 'relay' && !relayPoint) {
      setError('Choisis un point Mondial Relay avant de continuer.')
      return
    }
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/checkout-livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, email, delivery: mode, relayPoint: relayPoint || null }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url }
      else { setError(data.error || 'Une erreur est survenue.'); setLoading(false) }
    } catch { setError('Erreur réseau. Réessaie.'); setLoading(false) }
  }

  const canConfirm = mode === 'pickup' || (mode === 'relay' && relayPoint)

  return (
    <main className="min-h-screen bg-bg text-cream px-4 py-12 max-w-lg mx-auto">
      {/* Retour */}
      <button
        onClick={() => router.back()}
        className="text-muted2 text-sm hover:text-muted mb-8 flex items-center gap-1 transition"
      >
        ← Retour
      </button>

      {/* Résumé commande */}
      <div className="bg-surface border border-gold/20 rounded-2xl p-5 mb-8">
        <p className="text-xs text-gold/60 uppercase tracking-widest mb-1">Ta commande</p>
        <p className="font-[family-name:var(--font-playfair)] text-lg font-bold">{info.label}</p>
        <p className="text-2xl font-bold text-cream mt-1">{info.priceStr}</p>
        <p className="text-xs text-muted2 mt-1">Email : {email}</p>
      </div>

      {/* Choix livraison */}
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gold/70 mb-4">
        Mode de livraison
      </h2>

      <div className="flex flex-col gap-3 mb-6">
        {/* Point Relais */}
        <button
          type="button"
          onClick={() => setMode('relay')}
          className={`text-left p-4 rounded-2xl border transition ${
            mode === 'relay'
              ? 'border-gold/60 bg-gold/5'
              : 'border-border bg-surface hover:border-gold/30'
          }`}
        >
          <p className={`font-semibold text-sm ${mode === 'relay' ? 'text-gold' : 'text-cream'}`}>
            📦 Point Relais Mondial Relay
          </p>
          <p className="text-xs text-muted mt-0.5">+ {info.relayStr} · Retrait en 2–4 jours</p>
        </button>

        {/* Retrait église */}
        <button
          type="button"
          onClick={() => setMode('pickup')}
          className={`text-left p-4 rounded-2xl border transition ${
            mode === 'pickup'
              ? 'border-gold/60 bg-gold/5'
              : 'border-border bg-surface hover:border-gold/30'
          }`}
        >
          <p className={`font-semibold text-sm ${mode === 'pickup' ? 'text-gold' : 'text-cream'}`}>
            🏛️ Retrait à l'église La Rencontre
          </p>
          <p className="text-xs text-muted mt-0.5">Gratuit · 441 av. Marguerite Perrey, Lieusaint (77)</p>
        </button>
      </div>

      {/* Sélecteur relais */}
      {mode === 'relay' && (
        <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold mb-3 text-cream">Trouver un point Mondial Relay</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="Code postal (ex : 77127)"
              value={relayZip}
              onChange={e => setRelayZip(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && searchRelayPoints(relayZip)}
              className="flex-1 text-sm bg-surface2 border border-border rounded-lg px-3 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition"
            />
            <button
              onClick={() => searchRelayPoints(relayZip)}
              disabled={relayLoading || relayZip.length !== 5}
              className="px-4 py-2.5 rounded-lg bg-gold/80 text-bg font-semibold text-sm disabled:opacity-40 hover:bg-gold transition"
            >
              {relayLoading ? '…' : 'Chercher'}
            </button>
          </div>

          {relayError && <p className="text-xs text-red-400 mb-3">{relayError}</p>}

          {relayPoint && (
            <div className="flex items-center justify-between bg-gold/5 border border-gold/20 rounded-xl px-3 py-2.5 mb-3 text-xs">
              <div>
                <p className="font-bold text-cream">{relayPoint.name}</p>
                <p className="text-muted">{relayPoint.address}, {relayPoint.zipCode} {relayPoint.city}</p>
              </div>
              <button onClick={() => setRelayPoint(null)} className="text-muted2 hover:text-cream ml-3 flex-shrink-0">✕</button>
            </div>
          )}

          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {relayList.length === 0 && !relayLoading && relayZip.length === 5 && (
              <p className="text-xs text-muted2 text-center py-4">Aucun résultat.</p>
            )}
            {relayList.map(point => (
              <button
                key={point.code}
                onClick={() => setRelayPoint(point)}
                className={`text-left p-3 rounded-xl border text-xs transition ${
                  relayPoint?.code === point.code
                    ? 'border-gold/50 bg-gold/5'
                    : 'border-border bg-surface2 hover:border-gold/30'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-cream">{point.name}</p>
                    <p className="text-muted mt-0.5">{point.address}, {point.zipCode} {point.city}</p>
                  </div>
                  <span className="text-gold/70 font-semibold flex-shrink-0">{point.distance} m</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Infos retrait église */}
      {mode === 'pickup' && (
        <div className="bg-surface border border-gold/10 rounded-2xl p-4 mb-6 text-sm text-muted">
          <p className="font-semibold text-cream mb-1">Informations de retrait</p>
          <p>Église La Rencontre · 441 av. Marguerite Perrey, 77127 Lieusaint</p>
          <p className="mt-1">Dimanche 9h30–13h · Mardi 20h–22h</p>
          <p className="mt-2 text-xs text-muted2">Nicolas te contactera pour confirmer la date.</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* CTA */}
      <button
        onClick={confirm}
        disabled={!canConfirm || loading}
        className="w-full bg-gold text-bg font-bold text-sm py-4 rounded-2xl hover:bg-gold2 transition disabled:opacity-40"
      >
        {loading ? 'Redirection…' : 'Continuer vers le paiement →'}
      </button>

      <p className="text-xs text-muted2 text-center mt-4">Paiement sécurisé par Stripe · Carte bancaire, Apple Pay</p>
    </main>
  )
}

export default function LivraisonPage() {
  return (
    <Suspense>
      <LivraisonForm />
    </Suspense>
  )
}

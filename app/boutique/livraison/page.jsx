'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const PRODUCTS = {
  livre:  { label: 'Livre physique',             priceStr: '18,99€', relayStr: '4,15€', weight: 320  },
  pack3:  { label: 'Pack 3 exemplaires',         priceStr: '48€',    relayStr: '5,50€', weight: 960  },
  pack10: { label: 'Pack Église 10 exemplaires', priceStr: '140€',   relayStr: '9€',    weight: 3200 },
}

const MR_BRAND = 'CC23ZZZP'

function LivraisonForm() {
  const params  = useSearchParams()
  const router  = useRouter()
  const product = params.get('product')
  const email   = params.get('email')
  const info    = PRODUCTS[product]

  const [mode, setMode]           = useState(null)
  const [relayPoint, setRelayPoint] = useState(null)
  const [widgetReady, setWidgetReady] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const widgetRef = useRef(null)

  // Charger jQuery + Leaflet + widget MR quand le mode relay est sélectionné
  useEffect(() => {
    if (mode !== 'relay') return
    setRelayPoint(null)
    setWidgetReady(false)

    function loadStyle(href) {
      if (document.querySelector(`link[href="${href}"]`)) return
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href
      document.head.appendChild(l)
    }
    function loadScript(src, cb) {
      if (document.querySelector(`script[src="${src}"]`)) { cb?.(); return }
      const s = document.createElement('script'); s.src = src; s.onload = cb
      document.head.appendChild(s)
    }

    loadStyle('https://unpkg.com/leaflet/dist/leaflet.css')
    loadScript('https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js', () =>
      loadScript('https://unpkg.com/leaflet/dist/leaflet.js', () =>
        loadScript(
          'https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js',
          () => setWidgetReady(true)
        )
      )
    )
  }, [mode])

  // Initialiser le widget quand les scripts sont prêts
  useEffect(() => {
    if (!widgetReady || !widgetRef.current) return
    const $ = window.$
    $(widgetRef.current).empty().MR_ParcelShopPicker({
      Target: '#mr-relay-code',
      Brand: MR_BRAND,
      Country: 'FR',
      Responsive: true,
      Weight: info.weight,
      NbResults: 7,
      EnableGeolocalisatedSearch: true,
      OnParcelShopSelected: (data) => {
        setRelayPoint({
          code:    data.ID,
          name:    data.Nom,
          address: (data.Adresse1 + (data.Adresse2 ? ' ' + data.Adresse2 : '')).trim(),
          city:    data.Ville,
          zipCode: data.CP,
        })
      },
    })
  }, [widgetReady])

  if (!info || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cream">
        <p>Lien invalide. <a href="/boutique" className="text-gold underline">Retour à la boutique</a></p>
      </div>
    )
  }

  async function confirm() {
    if (mode === 'relay' && !relayPoint) {
      setError('Sélectionne un point Mondial Relay sur la carte avant de continuer.')
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
    <main className="min-h-screen bg-bg text-cream px-4 py-12 max-w-2xl mx-auto">
      <input type="hidden" id="mr-relay-code" />

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
        <p className="text-xs text-muted2 mt-1">{email}</p>
      </div>

      {/* Choix livraison */}
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gold/70 mb-4">
        Mode de livraison
      </h2>

      <div className="flex flex-col gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMode('relay')}
          className={`text-left p-4 rounded-2xl border transition ${
            mode === 'relay' ? 'border-gold/60 bg-gold/5' : 'border-border bg-surface hover:border-gold/30'
          }`}
        >
          <p className={`font-semibold text-sm ${mode === 'relay' ? 'text-gold' : 'text-cream'}`}>
            📦 Point Relais Mondial Relay
          </p>
          <p className="text-xs text-muted mt-0.5">+ {info.relayStr} · Retrait en 2–4 jours</p>
        </button>

        <button
          type="button"
          onClick={() => setMode('pickup')}
          className={`text-left p-4 rounded-2xl border transition ${
            mode === 'pickup' ? 'border-gold/60 bg-gold/5' : 'border-border bg-surface hover:border-gold/30'
          }`}
        >
          <p className={`font-semibold text-sm ${mode === 'pickup' ? 'text-gold' : 'text-cream'}`}>
            🏛️ Retrait à l'église La Rencontre
          </p>
          <p className="text-xs text-muted mt-0.5">Gratuit · 441 av. Marguerite Perrey, Lieusaint (77)</p>
        </button>
      </div>

      {/* Widget Mondial Relay */}
      {mode === 'relay' && (
        <div className="mb-6">
          {relayPoint && (
            <div className="flex items-center justify-between bg-gold/5 border border-gold/30 rounded-xl px-4 py-3 mb-4 text-sm">
              <div>
                <p className="font-bold text-cream">✓ {relayPoint.name}</p>
                <p className="text-muted text-xs mt-0.5">{relayPoint.address}, {relayPoint.zipCode} {relayPoint.city}</p>
              </div>
              <button onClick={() => setRelayPoint(null)} className="text-muted2 hover:text-cream ml-3 flex-shrink-0 text-xs">Changer</button>
            </div>
          )}
          {!widgetReady && (
            <div className="flex items-center justify-center h-48 text-muted2 text-sm">
              Chargement de la carte…
            </div>
          )}
          <div ref={widgetRef} className={widgetReady ? 'block' : 'hidden'} style={{ minHeight: '480px' }} />
        </div>
      )}

      {/* Retrait église */}
      {mode === 'pickup' && (
        <div className="bg-surface border border-gold/10 rounded-2xl p-4 mb-6 text-sm text-muted">
          <p className="font-semibold text-cream mb-1">Informations de retrait</p>
          <p>Église La Rencontre · 441 av. Marguerite Perrey, 77127 Lieusaint</p>
          <p className="mt-1">Dimanche 9h30–13h · Mardi 20h–22h</p>
          <p className="mt-2 text-xs text-muted2">Nicolas te contactera pour confirmer la date de retrait.</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

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

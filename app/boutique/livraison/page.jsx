'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const PRODUCTS = {
  tshirt: { label: 'T-shirt Distinction',        priceStr: '24,90€', relayStr: '4,10€', homeStr: '7,49€',  weight: 300,  isTshirt: true },
  livre:  { label: 'Livre physique',             priceStr: '18,99€', relayStr: '4,10€', homeStr: '7,49€',  weight: 320  },
  pack3:  { label: 'Pack 3 exemplaires',         priceStr: '48€',    relayStr: '4,51€', homeStr: '9,48€',  weight: 960  },
  pack10: { label: 'Pack Église 10 exemplaires', priceStr: '140€',   relayStr: '6,71€', homeStr: '16,34€', weight: 3200 },
}

const TAILLES = ['S', 'M', 'L', 'XL', 'XXL']
const TSHIRT_UNIT_CENTS  = 2490
const TSHIRT_PROMO_CENTS = 1990
const PROMO_TSHIRT = { code: 'DISTINCTION', label: 'Tarif Église La Rencontre' }

// ⚠️ À ajuster quand le poids réel est mesuré
const TSHIRT_WEIGHT_G = 300

function shippingCostCents(mode, weightG) {
  if (mode === 'pickup') return 0
  if (mode === 'relay') {
    if (weightG <=  500) return  410
    if (weightG <= 2000) return  451
    return 671
  }
  if (mode === 'home-mr') {
    if (weightG <=  500) return  749
    if (weightG <= 2000) return  948
    return 1634
  }
  if (mode === 'switzerland') return 1200
  return 0
}
function centsToStr(c) { return (c / 100).toFixed(2).replace('.', ',') + '€' }

const MR_BRAND = 'CC23ZZZP'

function LivraisonForm() {
  const params  = useSearchParams()
  const router  = useRouter()
  const product = params.get('product')
  const email   = params.get('email')
  const info    = PRODUCTS[product]

  const [mode, setMode]             = useState(null)
  const [relayPoint, setRelayPoint] = useState(null)
  const [widgetReady, setWidgetReady] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  // Multi-taille t-shirt
  const [sizes, setSizes]           = useState({S:0, M:0, L:0, XL:0, XXL:0})
  const [promoCode, setPromoCode]   = useState('')
  const promoValid    = info?.isTshirt && promoCode.trim().toUpperCase() === PROMO_TSHIRT.code
  const totalQty      = info?.isTshirt ? Object.values(sizes).reduce((s, n) => s + n, 0) : 1
  const totalWeightG  = info?.isTshirt ? TSHIRT_WEIGHT_G * totalQty : info?.weight ?? 0
  const unitCents     = promoValid ? TSHIRT_PROMO_CENTS : TSHIRT_UNIT_CENTS
  const productCents  = info?.isTshirt ? unitCents * totalQty : null
  // Prix affiché dans le résumé
  const displayedPrice = info?.isTshirt
    ? (totalQty > 0
        ? `${totalQty} × ${centsToStr(unitCents)} = ${centsToStr(productCents)}`
        : centsToStr(unitCents) + ' / pièce')
    : info?.priceStr
  // Frais de port calculés dynamiquement
  const shippingCents = shippingCostCents(mode, totalWeightG)
  const shippingStr   = shippingCents === 0 ? 'Gratuit' : '+ ' + centsToStr(shippingCents)
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
    if (info?.isTshirt && totalQty === 0) {
      setError('Sélectionne au moins une taille.')
      return
    }
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/checkout-livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product, email, delivery: mode, relayPoint: relayPoint || null,
          sizes: info?.isTshirt ? sizes : null,
          promoCode: promoCode.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url }
      else { setError(data.error || 'Une erreur est survenue.'); setLoading(false) }
    } catch { setError('Erreur réseau. Réessaie.'); setLoading(false) }
  }

  const canConfirm = (mode === 'pickup' || mode === 'home-mr' || mode === 'switzerland' || (mode === 'relay' && relayPoint))
    && (!info?.isTshirt || totalQty > 0)

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
        <p className="text-xl font-bold text-cream mt-1">{displayedPrice}</p>
        {info.isTshirt && promoValid && (
          <p className="text-xs text-ok mt-1">✓ Code {PROMO_TSHIRT.code} — {PROMO_TSHIRT.label}</p>
        )}
        {mode && (
          <p className="text-xs text-muted2 mt-1">
            Livraison : {shippingStr}
            {totalQty > 0 && productCents != null && shippingCents > 0 && (
              <> · Total : {centsToStr(productCents + shippingCents)}</>
            )}
          </p>
        )}
        <p className="text-xs text-muted2 mt-1">{email}</p>
      </div>

      {/* Sélecteur de tailles + quantités (t-shirt) */}
      {info.isTshirt && (
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gold/70">Tailles & quantités</h2>
            {totalQty > 0 && (
              <span className="text-xs text-muted">{totalQty} article{totalQty > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {TAILLES.map(t => (
              <div key={t} className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                sizes[t] > 0 ? 'border-gold/50 bg-gold/5' : 'border-border bg-surface'
              }`}>
                <span className={`text-sm font-bold w-10 ${sizes[t] > 0 ? 'text-gold' : 'text-muted'}`}>{t}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSizes(s => ({ ...s, [t]: Math.max(0, s[t] - 1) }))}
                    disabled={sizes[t] === 0}
                    className="w-8 h-8 rounded-lg border border-border bg-surface2 text-cream text-lg leading-none flex items-center justify-center hover:border-gold/40 transition disabled:opacity-30"
                  >−</button>
                  <span className={`w-5 text-center text-sm font-bold ${sizes[t] > 0 ? 'text-cream' : 'text-muted2'}`}>
                    {sizes[t]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSizes(s => ({ ...s, [t]: s[t] + 1 }))}
                    className="w-8 h-8 rounded-lg border border-border bg-surface2 text-cream text-lg leading-none flex items-center justify-center hover:border-gold/40 transition"
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code promo (t-shirt uniquement) */}
      {info.isTshirt && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gold/70 mb-4">
            Code promo (optionnel)
          </h2>
          <input
            type="text"
            placeholder="Code promo"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            className="w-full text-sm bg-surface2 border border-border rounded-xl px-4 py-3 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition uppercase tracking-widest"
          />
          {promoCode && !promoValid && (
            <p className="text-xs text-muted2 mt-2">Code non reconnu ou non applicable.</p>
          )}
        </div>
      )}

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
          <p className="text-xs text-muted mt-0.5">
            {info.isTshirt ? '+ ' + centsToStr(shippingCostCents('relay', totalWeightG)) : '+ ' + info.relayStr} · Retrait en 2–4 jours
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode('home-mr')}
          className={`text-left p-4 rounded-2xl border transition ${
            mode === 'home-mr' ? 'border-gold/60 bg-gold/5' : 'border-border bg-surface hover:border-gold/30'
          }`}
        >
          <p className={`font-semibold text-sm ${mode === 'home-mr' ? 'text-gold' : 'text-cream'}`}>
            🏠 Livraison à domicile Mondial Relay
          </p>
          <p className="text-xs text-muted mt-0.5">
            {info.isTshirt ? '+ ' + centsToStr(shippingCostCents('home-mr', totalWeightG)) : '+ ' + info.homeStr} · Livraison en 3–5 jours ouvrés
          </p>
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

        <button
          type="button"
          onClick={() => setMode('switzerland')}
          className={`text-left p-4 rounded-2xl border transition ${
            mode === 'switzerland' ? 'border-gold/60 bg-gold/5' : 'border-border bg-surface hover:border-gold/30'
          }`}
        >
          <p className={`font-semibold text-sm ${mode === 'switzerland' ? 'text-gold' : 'text-cream'}`}>
            🇨🇭 Livraison en Suisse (Colissimo)
          </p>
          <p className="text-xs text-muted mt-0.5">+ 12€ · Livraison en 3–5 jours ouvrés</p>
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
          <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', display: widgetReady ? 'block' : 'none', minHeight: '480px', color: '#111' }}>
            <style>{`
              .mr-widget-root, .mr-widget-root *, .mr-widget-root input, .mr-widget-root select, .mr-widget-root label, .mr-widget-root p, .mr-widget-root span, .mr-widget-root div, .mr-widget-root td, .mr-widget-root th, .mr-widget-root a { color: #111 !important; }
              .mr-widget-root input, .mr-widget-root select { background: #fff !important; border-color: #ccc !important; }
            `}</style>
            <div ref={widgetRef} className="mr-widget-root" />
          </div>
        </div>
      )}

      {/* Domicile MR */}
      {mode === 'home-mr' && (
        <div className="bg-surface border border-gold/10 rounded-2xl p-4 mb-6 text-sm text-muted">
          <p className="font-semibold text-cream mb-1">Livraison à votre adresse</p>
          <p>Mondial Relay livrera le colis à l'adresse que tu indiqueras à l'étape suivante.</p>
          <p className="mt-1">Délai estimé : 3 à 5 jours ouvrés après expédition.</p>
          <p className="mt-2 text-xs text-muted2">Ton adresse sera saisie sur la page de paiement sécurisée Stripe.</p>
        </div>
      )}

      {/* Suisse */}
      {mode === 'switzerland' && (
        <div className="bg-surface border border-gold/10 rounded-2xl p-4 mb-6 text-sm text-muted">
          <p className="font-semibold text-cream mb-1">Livraison en Suisse</p>
          <p>Colissimo livrera le colis à l'adresse que tu indiqueras à l'étape suivante.</p>
          <p className="mt-1">Délai estimé : 3 à 5 jours ouvrés après expédition.</p>
          <p className="mt-2 text-xs text-muted2">Ton adresse suisse sera saisie sur la page de paiement sécurisée Stripe.</p>
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

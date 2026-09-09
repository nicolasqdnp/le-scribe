'use client'
import { useState } from 'react'

const TAILLES = ['S', 'M', 'L', 'XL', 'XXL']

export default function VetementsPage() {
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')

  function handleBuy() {
    if (!email || !email.includes('@')) { setError('Saisis ton adresse email pour continuer.'); return }
    setError('')
    window.location.href = `/boutique/livraison?product=tshirt&email=${encodeURIComponent(email)}`
  }

  return (
    <main className="min-h-screen page-glow">
      {/* Header avec breadcrumb */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm">
          <a href="/" className="font-[family-name:var(--font-playfair)] text-lg font-bold text-gold">Le Scribe</a>
          <span className="text-border mx-1">›</span>
          <a href="/boutique" className="text-muted hover:text-cream transition">Boutique</a>
          <span className="text-border mx-1">›</span>
          <span className="text-cream">Vêtements</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">

        <p className="text-xs font-medium text-gold/60 uppercase tracking-widest mb-6">👕 Vêtements</p>

        {/* Carte produit */}
        <div className="flex flex-col md:flex-row gap-10 items-start">

          {/* Visuel */}
          <div className="flex-shrink-0 w-full md:w-80 bg-surface2 rounded-2xl border border-border overflow-hidden flex items-center justify-center p-8" style={{ minHeight: '320px' }}>
            <img
              src="/distinction.png"
              alt="T-shirt Distinction — Le Scribe"
              style={{ maxHeight: '280px', objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* Infos */}
          <div className="flex-1">
            <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">T-shirt</span>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-cream mt-1 mb-2">
              Distinction
            </h1>
            <p className="text-muted text-sm mb-1">Col rond · Impression sérigraphiée</p>
            <p className="text-muted text-sm mb-6">Tailles disponibles : S / M / L / XL / XXL</p>

            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-bold text-cream">24,90€</span>
            </div>
            <p className="text-xs text-muted2 mb-2">Code promo <span className="text-gold font-mono tracking-widest">DISTINCTION</span> → 19,90€ (tarif Église La Rencontre)</p>
            <p className="text-xs text-muted2 mb-8">+ frais d'envoi ou retrait gratuit à l'église La Rencontre — Lieusaint (77)</p>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <p className="text-xs text-muted uppercase tracking-widest mb-4">Commander</p>

              {error && <p className="text-err text-xs mb-3">{error}</p>}

              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-3 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
              />
              <p className="text-xs text-muted2 mb-4">
                La taille et le code promo sont sélectionnés à l'étape suivante.
              </p>
              <button
                onClick={handleBuy}
                className="w-full bg-gold text-bg font-bold text-sm py-3.5 rounded-xl hover:bg-gold2 transition"
              >
                Continuer → Choisir ma taille
              </button>
              <p className="text-xs text-muted2 text-center mt-4">
                Paiement sécurisé par Stripe · Carte bancaire, Apple Pay, Google Pay
              </p>
            </div>
          </div>
        </div>

        {/* Détails produit */}
        <div className="mt-12 pt-10 border-t border-border grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-cream mb-3 text-sm uppercase tracking-widest">Caractéristiques</h3>
            <ul className="text-sm text-muted space-y-2">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Col rond, coupe unisexe</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Impression sérigraphiée</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Tailles S, M, L, XL, XXL</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-cream mb-3 text-sm uppercase tracking-widest">Livraison</h3>
            <ul className="text-sm text-muted space-y-2">
              <li className="flex items-center gap-2"><span className="text-gold text-xs">→</span> Retrait gratuit · Église La Rencontre, Lieusaint</li>
              <li className="flex items-center gap-2"><span className="text-gold text-xs">→</span> Point Relais Mondial Relay · + 4,10€</li>
              <li className="flex items-center gap-2"><span className="text-gold text-xs">→</span> Livraison domicile · + 5,00€</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted2 text-xs">© 2025 Éditions Le Scribe · <a href="https://lescribe.app" className="hover:text-muted transition">lescribe.app</a></p>
        </div>
      </div>
    </main>
  )
}

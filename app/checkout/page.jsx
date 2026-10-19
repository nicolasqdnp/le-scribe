'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CheckoutPage() {
  const [loading, setLoading] = useState(null)

  async function goCheckout(plan) {
    setLoading(plan)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else alert('Erreur : ' + (json.error || 'Impossible de créer la session de paiement'))
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
    setLoading(null)
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-16">
      <Link href="/dashboard" className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-gold mb-12 block">
        Le Scribe
      </Link>

      <div className="max-w-lg w-full">
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream text-center mb-2">
          Choisir un forfait
        </h1>
        <p className="text-sm text-muted text-center mb-10">
          Accès immédiat après paiement. Stripe sécurisé — carte, Google Pay, Apple Pay.
        </p>

        <div className="space-y-4">
          {/* Par livre */}
          <div className="p-6 rounded-2xl border-2 border-gold/40 bg-gold/5">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-cream text-lg">Par livre</div>
              <div className="font-[family-name:var(--font-playfair)] font-bold text-gold text-2xl">59€</div>
            </div>
            <p className="text-xs text-muted mb-1">Paiement unique · 1 livre complet</p>
            <ul className="text-xs text-muted2 space-y-1 mb-5">
              {['Chapitres illimités', 'Export Word / DOCX', 'Sources YouTube, PDF, Word'].map(f => (
                <li key={f} className="flex items-center gap-1.5"><span className="text-gold">✦</span> {f}</li>
              ))}
            </ul>
            <button
              onClick={() => goCheckout('livre')}
              disabled={loading !== null}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-gold text-bg hover:bg-gold2 transition disabled:opacity-60"
            >
              {loading === 'livre' ? '⏳ Redirection…' : 'Payer 59€ →'}
            </button>
          </div>

          {/* Forfait 5 livres */}
          <div className="p-6 rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-cream text-lg">Forfait 5 livres</div>
              <div className="font-[family-name:var(--font-playfair)] font-bold text-cream text-2xl">159€</div>
            </div>
            <p className="text-xs text-muted mb-1">3 mois · 5 livres max · Support dédié</p>
            <p className="text-xs text-ok mb-5">Économise 136€ vs le tarif au livre</p>
            <button
              onClick={() => goCheckout('forfait')}
              disabled={loading !== null}
              className="w-full py-3 rounded-xl text-sm font-medium border border-border text-cream hover:border-gold/30 hover:bg-surface2 transition disabled:opacity-60"
            >
              {loading === 'forfait' ? '⏳ Redirection…' : 'Payer 159€ →'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted2 mt-6">
          🔒 Paiement sécurisé par Stripe · Accès immédiat après confirmation
        </p>
        <div className="text-center mt-4">
          <Link href="/dashboard" className="text-xs text-muted hover:text-cream transition">
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    </main>
  )
}

'use client'
import { useState } from 'react'
import ThemeToggle from '../components/ThemeToggle'

export default function BoutiquePage() {
  const [emailEpub, setEmailEpub] = useState('')
  const [loadingEpub, setLoadingEpub] = useState(false)
  const [error, setError] = useState('')

  async function handleBuy(product, email, setLoading) {
    if (!email || !email.includes('@')) {
      setError('Saisis ton adresse email pour continuer.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/checkout-livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Une erreur est survenue.')
        setLoading(false)
      }
    } catch {
      setError('Erreur réseau. Réessaie dans un instant.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen page-glow">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-gold">
          Le Scribe
        </a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Éditions Le Scribe</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Titre éditeur */}
        <p className="text-xs font-medium text-gold/60 uppercase tracking-widest mb-6 text-center">
          Éditions Le Scribe — Premier titre
        </p>

        {/* Bloc principal : couverture + infos */}
        <div className="flex flex-col md:flex-row gap-12 items-start mb-16">

          {/* Couverture */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <img
              src="/lurgence-des-temps-couv-v2.png"
              alt="L'urgence des temps — Nicolas Salafranque"
              className="w-52 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
            />
          </div>

          {/* Infos livre */}
          <div className="flex-1">
            <p className="text-xs font-medium text-gold/60 uppercase tracking-widest mb-3">
              Et si nous étions la génération dont parle Jésus ?
            </p>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-cream leading-tight mb-2">
              L'urgence des temps
            </h1>
            <p className="text-gold text-base mb-1">Nicolas Salafranque</p>
            <p className="text-muted2 text-xs mb-6">Éditions Le Scribe · 2026 · 211 pages · ISBN 979-1098694301</p>

            <p className="text-cream2 text-sm leading-relaxed mb-3">
              Pendant des années, des prédicateurs ont annoncé la fin du monde. Ils se sont trompés — pas par manque de zèle, mais parce qu'ils ont sauté des étapes que Jésus Lui-même a décrites dans les Évangiles.
            </p>
            <p className="text-cream2 text-sm leading-relaxed mb-4">
              En croisant <strong className="text-cream">Daniel, Matthieu 24, 2 Thessaloniciens 2 et l'Apocalypse</strong>, une chronologie se dessine — cohérente, ancrée dans la Parole — qui change tout à la manière dont on aborde la fin des temps.
            </p>
            <ul className="text-sm text-muted space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> La différence cruciale entre « grande tribulation » et « colère divine »</li>
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> Où se situe vraiment l'enlèvement dans la séquence des sceaux</li>
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> Les hypothèses 2029-2032 — sans panique ni obsession des dates</li>
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> Le concept de « Goshen » : bâtir des lieux de refuge</li>
            </ul>
          </div>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mb-8 bg-err/10 border border-err/20 text-err text-sm rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        {/* Options d'achat */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* EPUB */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Numérique</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  EPUB
                </h2>
                <p className="text-muted text-xs mt-1">Téléchargement immédiat · Compatible toutes liseuses</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold text-cream">9€</span>
              </div>
            </div>

            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Liseuse Kindle, Kobo, Apple Books…</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison instantanée par email</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Aucun frais de port</li>
            </ul>

            <input
              type="email"
              placeholder="ton@email.com"
              value={emailEpub}
              onChange={e => setEmailEpub(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('epub', emailEpub, setLoadingEpub)}
              disabled={loadingEpub}
              className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded-xl hover:bg-gold2 transition disabled:opacity-60">
              {loadingEpub ? 'Redirection…' : 'Acheter l\'EPUB — 9€'}
            </button>
          </div>

          {/* Livre physique */}
          <div className="bg-surface border border-gold/20 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-medium bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded-full">
                Disponible
              </span>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Papier</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  Livre physique
                </h2>
                <p className="text-muted text-xs mt-1">Expédié par Amazon · livraison rapide</p>
              </div>
              <div className="text-right flex-shrink-0 mt-5">
                <span className="text-2xl font-bold text-cream">18,99€</span>
                <p className="text-xs text-muted">+ 3€ port</p>
              </div>
            </div>

            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Impression et expédition par Amazon</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison France et international</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Suivi de commande Amazon</li>
            </ul>

            <a
              href="https://www.amazon.fr/dp/B0H4NN4FXF"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-gold/40 text-gold font-semibold text-sm py-3 rounded-xl hover:bg-gold/5 hover:border-gold/60 transition text-center">
              Commander sur Amazon — 18,99€
            </a>
          </div>
        </div>

        {/* Paiement sécurisé */}
        <p className="text-center text-xs text-muted2 mt-8">
          EPUB : paiement sécurisé par Stripe · Carte bancaire, Apple Pay, Google Pay
        </p>

        {/* À propos de l'auteur */}
        <div className="mt-16 pt-10 border-t border-border">
          <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mb-4">À propos de l'auteur</h3>
          <p className="text-cream2 text-sm leading-relaxed">
            Nicolas Salafranque est pasteur à l'Église La Rencontre. Il est également le fondateur de
            <a href="https://lescribe.app" className="text-gold hover:text-gold2 transition"> Le Scribe</a>,
            un outil IA qui aide les pasteurs et prédicateurs à transformer leurs prédications en livres.
            <em>L'urgence des temps</em> est son premier ouvrage publié sous les Éditions Le Scribe.
          </p>
        </div>

        {/* Footer Éditions */}
        <div className="mt-12 text-center">
          <p className="text-muted2 text-xs">
            © 2025 Éditions Le Scribe ·{' '}
            <a href="https://lescribe.app" className="hover:text-muted transition">lescribe.app</a>
          </p>
        </div>
      </div>
    </main>
  )
}

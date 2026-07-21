'use client'
import { useState, useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle'

const TESTIMONIALS = [
  { initials: 'PS', name: 'Patrick Salafranque', role: "Pasteur · Préface · Père de l'auteur",
    quote: "Comme quand on pénètre dans une pièce obscure, si on prend le temps d'y demeurer, l'œil s'adapte et les choses deviennent visibles : c'est bien le but de ce livre. Une approche originale, qui répond à des questions très concrètes — la grande tribulation, le temps de la colère de Dieu, l'enlèvement de l'Église, comment discerner les temps que nous vivons et comment s'y préparer. Merci à Nicolas pour ce travail fouillé, cette vision à 360° de la fin des temps. Ce livre est facile à lire et affermira votre foi dans ce retour imminent de notre merveilleux Sauveur." },
  { initials: 'FB', name: 'François Bernot', role: 'Docteur en physique appliquée · Préface',
    quote: "Se pencher sur la fin des temps en prenant une position claire, limpide et didactisée, c'est faire preuve d'un grand courage, car les contradicteurs sur ce thème sont légion. Alors merci Nicolas, mon ami, d'avoir mouillé ta chemise — et surtout d'avoir effacé la brume qui régnait dans mon esprit sur ce thème qui, autrefois, m'avait passionné." },
  { initials: 'AS', name: 'Aymerick Sroka', role: 'Prophète · Préface',
    quote: "Il y a des livres que l'on lit simplement pour apprendre. Et puis il y a des livres que l'on lit parce qu'ils viennent toucher une urgence, réveiller une conscience et remettre une génération devant une réalité qu'elle ne peut plus ignorer. L'urgence des temps fait partie de ces ouvrages. Il ne cherche pas à produire de la peur : il nous ramène à une vérité simple — Jésus n'a jamais parlé des temps de la fin pour effrayer ses disciples, mais pour les préparer. Ce n'est pas une urgence de panique : c'est une urgence d'alignement, de consécration, de réveil. Car au bout de l'histoire, le dernier mot appartient à l'Agneau. Viens, Seigneur Jésus." },
  { initials: '✦', name: 'Un ami lecteur', role: '',
    quote: "C'est comme une étude biblique — tu pourrais te poser avec le livre et ta Bible à côté. J'apprends énormément, alors que je pensais déjà connaître le sujet. Il y a un travail monstre derrière ces pages : non seulement d'étude, mais aussi de pédagogie. C'est accessible, malgré la profondeur. En tant qu'ami et chrétien qui veut en savoir plus sur le retour de Jésus, c'est hyper enrichissant. Merci grandement." },
]

function Stars({ value, max = 5, size = 'text-xl', interactive = false, onHover, onClick, hover = 0 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = interactive ? (hover || value) > i : value > i
        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onMouseEnter={() => onHover?.(i + 1)}
            onMouseLeave={() => onHover?.(0)}
            onClick={() => onClick?.(i + 1)}
            className={`${size} leading-none ${filled ? 'text-gold' : 'text-muted2'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} bg-transparent border-0 p-0`}
            aria-label={interactive ? `${i + 1} étoile${i > 0 ? 's' : ''}` : undefined}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export default function BoutiquePage() {
  const [emailEpub, setEmailEpub] = useState('')
  const [loadingEpub, setLoadingEpub] = useState(false)
  const [emailLivre, setEmailLivre] = useState('')
  const [loadingLivre, setLoadingLivre] = useState(false)
  const [emailPack3, setEmailPack3] = useState('')
  const [loadingPack3, setLoadingPack3] = useState(false)
  const [emailPack10, setEmailPack10] = useState('')
  const [loadingPack10, setLoadingPack10] = useState(false)
  const [error, setError] = useState('')

  const [reviews, setReviews] = useState([])
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewState, setReviewState] = useState('idle')

  useEffect(() => {
    fetch('/api/reviews').then(r => r.json()).then(setReviews).catch(() => {})
  }, [])

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

  async function handleReviewSubmit(e) {
    e.preventDefault()
    if (!reviewRating) return
    setReviewState('loading')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: reviewName, rating: reviewRating, comment: reviewComment }),
      })
      if (res.ok) {
        setReviewState('done')
        setReviewName(''); setReviewRating(0); setReviewComment('')
        fetch('/api/reviews').then(r => r.json()).then(setReviews).catch(() => {})
      } else {
        setReviewState('error')
      }
    } catch {
      setReviewState('error')
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

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

          {/* Couverture flottante */}
          <div className="flex-shrink-0 mx-auto md:mx-0" style={{ animation: 'ls-float 3s ease-in-out infinite' }}>
            <style>{`@keyframes ls-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src="/lurgence-des-temps-couv-v2.png"
                alt="L'urgence des temps — Nicolas Salafranque"
                className="w-52 rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
              />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(201,167,125,.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
            </div>
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
        <div className="grid md:grid-cols-2 gap-6 mb-4">

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
                <p className="text-muted text-xs mt-1">Éditions Le Scribe · 211 pages</p>
              </div>
              <div className="text-right flex-shrink-0 mt-5">
                <span className="text-2xl font-bold text-cream">18,99€</span>
              </div>
            </div>

            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Éditions Le Scribe · 211 pages</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison France, Belgique, Suisse, Luxembourg</li>
            </ul>

            <p className="text-xs text-muted2 mb-3">+ frais d'envoi calculés à l'étape suivante</p>
            <input
              type="email"
              placeholder="ton@email.com"
              value={emailLivre}
              onChange={e => setEmailLivre(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('livre', emailLivre, setLoadingLivre)}
              disabled={loadingLivre}
              className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded-xl hover:bg-gold2 transition disabled:opacity-60">
              {loadingLivre ? 'Redirection…' : 'Commander le livre — 18,99€'}
            </button>
          </div>
        </div>

        {/* Packs groupés */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Pack 3 */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Pack famille · offrir</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  3 exemplaires
                </h2>
                <p className="text-muted text-xs mt-1">16 € / ex. · Économisez 8,97 € vs prix unitaire</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold text-cream">48€</span>
              </div>
            </div>
            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> 3 livres dans le même colis</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Idéal pour offrir à des proches</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison France, Belgique, Suisse, Luxembourg</li>
            </ul>
            <p className="text-xs text-muted2 mb-3">+ frais d'envoi calculés à l'étape suivante</p>
            <input
              type="email"
              placeholder="ton@email.com"
              value={emailPack3}
              onChange={e => setEmailPack3(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('pack3', emailPack3, setLoadingPack3)}
              disabled={loadingPack3}
              className="w-full bg-surface2 border border-border text-cream font-semibold text-sm py-3 rounded-xl hover:border-gold/40 transition disabled:opacity-60">
              {loadingPack3 ? 'Redirection…' : 'Commander le pack — 48€'}
            </button>
          </div>

          {/* Pack Église */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Pack Église · diffusion</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  10 exemplaires
                </h2>
                <p className="text-muted text-xs mt-1">14 € / ex. · Remise spéciale communautés</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold text-cream">140€</span>
              </div>
            </div>
            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> 10 livres dans le même colis</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Idéal pour une église, un groupe d'études</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison France, Belgique, Suisse, Luxembourg</li>
            </ul>
            <p className="text-xs text-muted2 mb-3">+ frais d'envoi calculés à l'étape suivante</p>
            <input
              type="email"
              placeholder="ton@email.com"
              value={emailPack10}
              onChange={e => setEmailPack10(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('pack10', emailPack10, setLoadingPack10)}
              disabled={loadingPack10}
              className="w-full bg-surface2 border border-border text-cream font-semibold text-sm py-3 rounded-xl hover:border-gold/40 transition disabled:opacity-60">
              {loadingPack10 ? 'Redirection…' : 'Commander le pack — 140€'}
            </button>
          </div>

        </div>

        {/* Paiement sécurisé */}
        <p className="text-center text-xs text-muted2 mt-8">
          EPUB : paiement sécurisé par Stripe · Carte bancaire, Apple Pay, Google Pay
        </p>

        {/* ── Témoignages ──────────────────────────────────────────── */}
        <div className="mt-20 pt-10 border-t border-border">
          <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream mb-8">
            Ce que disent les lecteurs
          </h3>
          <div className="flex flex-col gap-4">
            {TESTIMONIALS.map((t, i) => (
              <blockquote key={i} className="m-0 p-7 bg-surface border border-border border-l-[3px] border-l-gold/60 rounded-2xl">
                <span className="font-[family-name:var(--font-playfair)] text-5xl leading-none text-gold/30 block h-6 mb-1">"</span>
                <p className="font-[family-name:var(--font-playfair)] text-sm italic text-cream2 leading-relaxed mb-5">{t.quote}</p>
                <footer className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-[#d4b896] to-[#b8966c] text-[#0d0d0d] font-[family-name:var(--font-playfair)] font-bold text-sm flex items-center justify-center">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-cream">{t.name}</div>
                    {t.role && <div className="text-xs text-muted mt-0.5">{t.role}</div>}
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>

        {/* ── Avis lecteurs ─────────────────────────────────────────── */}
        <div className="mt-16 pt-10 border-t border-border">
          <div className="flex items-end gap-4 mb-8">
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream">
              Avis des lecteurs
            </h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-0.5">
                <Stars value={Math.round(avgRating)} size="text-base" />
                <span className="text-sm text-muted">
                  {avgRating.toFixed(1)} · {reviews.length} avis
                </span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="text-sm text-muted mb-8">Aucun avis pour le moment. Soyez le premier !</p>
          ) : (
            <div className="flex flex-col gap-4 mb-10">
              {reviews.map(r => (
                <div key={r.id} className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} size="text-sm" />
                      <span className="text-sm font-semibold text-cream">{r.name}</span>
                    </div>
                    <span className="text-xs text-muted2">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-cream leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire d'avis */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h4 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-cream mb-5">
              Laisser un avis
            </h4>

            {reviewState === 'done' ? (
              <div className="text-center py-4">
                <p className="text-ok text-sm mb-1">✓ Merci pour votre avis !</p>
                <p className="text-xs text-muted">Votre avis a bien été enregistré.</p>
                <button
                  onClick={() => setReviewState('idle')}
                  className="mt-4 text-xs text-gold hover:text-gold2 transition"
                >
                  Laisser un autre avis
                </button>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1.5">Votre note *</label>
                  <Stars
                    value={reviewRating}
                    hover={reviewHover}
                    size="text-3xl"
                    interactive
                    onHover={setReviewHover}
                    onClick={setReviewRating}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1.5">Votre prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jean-Pierre"
                    value={reviewName}
                    onChange={e => setReviewName(e.target.value)}
                    maxLength={100}
                    className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1.5">Votre commentaire *</label>
                  <textarea
                    required
                    placeholder="Partagez votre ressenti sur ce livre…"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition resize-none"
                  />
                </div>

                {reviewState === 'error' && (
                  <p className="text-xs text-err">Une erreur est survenue. Réessayez.</p>
                )}

                <button
                  type="submit"
                  disabled={reviewState === 'loading' || !reviewRating}
                  className="self-start bg-gold text-bg font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-gold2 transition disabled:opacity-50"
                >
                  {reviewState === 'loading' ? 'Envoi…' : 'Publier mon avis'}
                </button>
              </form>
            )}
          </div>
        </div>

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

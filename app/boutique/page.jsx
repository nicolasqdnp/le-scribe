'use client'
import { useState, useEffect, useRef } from 'react'

const FEATURED = [
  {
    id: 'livre',
    href: '/boutique/livres',
    img: '/lurgence-des-temps-couv-v2.png',
    label: "L'urgence des temps",
    sub: 'Livre physique · Éditions Le Scribe · 211 pages',
    price: '18,99€',
    tag: '📖 Livres',
    float: true,
  },
  {
    id: 'epub',
    href: '/boutique/livres',
    img: '/lurgence-des-temps-couv-v2.png',
    label: "L'urgence des temps",
    sub: 'Format numérique EPUB · Compatible toutes liseuses',
    price: '9€',
    tag: '📖 Livres',
    float: true,
  },
  {
    id: 'tshirt',
    href: '/boutique/vetements',
    img: '/distinction.png',
    label: 'T-shirt Distinction',
    sub: 'Col rond · Impression sérigraphiée · S à XXL',
    price: '24,90€',
    tag: '👕 Vêtements',
    float: false,
  },
]

export default function BoutiquePage() {
  const [slide, setSlide]         = useState(0)
  const timerRef                  = useRef(null)

  function goSlide(i) {
    setSlide((i + FEATURED.length) % FEATURED.length)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % FEATURED.length), 4500)
  }

  useEffect(() => {
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % FEATURED.length), 4500)
    return () => clearInterval(timerRef.current)
  }, [])

  const feat = FEATURED[slide]

  return (
    <main className="min-h-screen page-glow">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-gold">Le Scribe</a>
        <span className="text-xs text-muted">Éditions Le Scribe</span>
      </header>

      {/* ── Bandeau héro défilant ─────────────────────────────────── */}
      <div className="relative border-b border-border bg-surface overflow-hidden">
        <style>{`
          @keyframes ls-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          .feat-float { animation: ls-float 3s ease-in-out infinite; }
        `}</style>

        <a href={feat.href} className="block group">
          <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-10">

            {/* Visuel */}
            <div className={`flex-shrink-0 flex justify-center ${feat.float ? 'feat-float' : ''}`} key={slide}>
              <img
                src={feat.img}
                alt={feat.label}
                className="h-52 object-contain rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] group-hover:scale-[1.03] transition-transform duration-300"
              />
            </div>

            {/* Texte */}
            <div className="flex-1 text-center md:text-left">
              <span className="text-xs font-medium text-gold/60 uppercase tracking-widest block mb-2">{feat.tag}</span>
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold text-cream leading-tight mb-1 group-hover:text-gold transition-colors duration-200">
                {feat.label}
              </h1>
              <p className="text-muted text-sm mb-3">{feat.sub}</p>
              <p className="text-2xl font-bold text-gold mb-6">{feat.price}</p>

              <span className="inline-block bg-gold text-bg font-bold text-sm px-7 py-3 rounded-xl group-hover:bg-gold2 transition">
                Voir le produit →
              </span>
            </div>
          </div>
        </a>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 pb-5">
          {FEATURED.map((_, i) => (
            <button
              key={i} type="button" onClick={() => goSlide(i)}
              className={`w-2 h-2 rounded-full transition ${i === slide ? 'bg-gold' : 'bg-border hover:bg-gold/40'}`}
            />
          ))}
        </div>

        {/* Flèches */}
        <button
          type="button" onClick={() => goSlide(slide - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-surface2/80 border border-border text-muted hover:text-cream hover:border-gold/40 transition text-lg"
          aria-label="Précédent"
        >‹</button>
        <button
          type="button" onClick={() => goSlide(slide + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-surface2/80 border border-border text-muted hover:text-cream hover:border-gold/40 transition text-lg"
          aria-label="Suivant"
        >›</button>
      </div>

      {/* ── Rayons ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-14">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream mb-8 text-center">
          Nos rayons
        </h2>

        <div className="grid grid-cols-2 gap-4 md:gap-6">

          {/* Livres */}
          <a
            href="/boutique/livres"
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-gold/50 hover:bg-surface2 transition-all duration-200 flex flex-col items-center justify-center py-12 gap-3 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-14 h-14 text-gold/70 group-hover:text-gold transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="6" width="22" height="36" rx="2"/>
              <path d="M8 10h22M8 16h22M8 22h14"/>
              <path d="M30 24v16l5-3 5 3V24" strokeWidth="1.8"/>
            </svg>
            <div className="text-center">
              <span className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream group-hover:text-gold transition block">Livres</span>
              <span className="text-xs text-muted mt-0.5 block">EPUB · Physique · Packs</span>
            </div>
            <span className="absolute bottom-4 right-4 text-xs text-gold/50 group-hover:text-gold transition">→</span>
          </a>

          {/* Vêtements */}
          <a
            href="/boutique/vetements"
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface hover:border-gold/50 hover:bg-surface2 transition-all duration-200 flex flex-col items-center justify-center py-12 gap-3 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-14 h-14 text-gold/70 group-hover:text-gold transition-colors duration-200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 6 L8 14 L14 18 L14 42 L34 42 L34 18 L40 14 L32 6 C32 6 30 10 24 10 C18 10 16 6 16 6 Z"/>
            </svg>
            <div className="text-center">
              <span className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream group-hover:text-gold transition block">Vêtements</span>
              <span className="text-xs text-muted mt-0.5 block">T-shirt Distinction</span>
            </div>
            <span className="absolute bottom-4 right-4 text-xs text-gold/50 group-hover:text-gold transition">→</span>
          </a>

        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-12">
        <p className="text-muted2 text-xs">
          © 2025 Éditions Le Scribe ·{' '}
          <a href="https://lescribe.app" className="hover:text-muted transition">lescribe.app</a>
        </p>
      </div>
    </main>
  )
}

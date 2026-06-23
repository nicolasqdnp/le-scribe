import WordCycler from './components/WordCycler'
import ThemeToggle from './components/ThemeToggle'

export default function Home() {
  return (
    <main className="min-h-screen page-glow text-cream">

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/lescribe-logo-fond-sombre.png" alt="Le Scribe" className="logo-nav-dark h-8 w-auto" />
            <img src="/lescribe-logo-fond-clair.png" alt="Le Scribe" className="logo-nav-light h-8 w-auto" />
          </a>
          {/* Liens navigation centre */}
          <nav className="hidden md:flex items-center gap-1">
            <a href="#comment" className="text-sm text-muted hover:text-cream px-4 py-2 rounded-lg hover:bg-surface transition">Comment ça marche</a>
            <a href="#tarifs" className="text-sm text-muted hover:text-cream px-4 py-2 rounded-lg hover:bg-surface transition">Tarifs</a>
            <a href="/boutique" className="text-sm text-gold hover:text-gold2 px-4 py-2 rounded-lg hover:bg-surface transition">Boutique</a>
            <a href="/campagne" className="text-sm text-gold hover:text-gold2 px-4 py-2 rounded-lg hover:bg-surface transition">Campagne</a>
            <a href="#tutos" className="text-sm text-muted2 hover:text-muted px-4 py-2 rounded-lg transition flex items-center gap-1.5">
              Tutos
              <span className="text-[10px] bg-surface2 text-muted2 border border-border px-1.5 py-0.5 rounded-full">Bientôt</span>
            </a>
          </nav>
          <div className="flex gap-2 items-center">
            <a href="/login" className="text-sm text-muted hover:text-cream px-4 py-2 transition">Connexion</a>
            <a href="/inscription" className="text-sm bg-gold text-bg font-medium px-5 py-2 rounded-lg hover:bg-gold2 transition">
              Commencer
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block text-xs font-medium tracking-[0.15em] uppercase text-gold border border-gold/30 bg-gold/5 px-4 py-1.5 rounded-full mb-10">
            Pour les pasteurs, influenceurs et auteurs chrétiens
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-6xl font-bold text-cream leading-tight mb-7">
            Transforme tes<br />
            <WordCycler /><br />
            <span className="text-gold">en livre publié</span>
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto mb-12 leading-relaxed">
            Le Scribe analyse tes contenus textes et vidéos et t'accompagne chapitre par chapitre — pour créer le livre qui te ressemble.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/inscription"
              className="bg-gold text-bg px-8 py-4 rounded-xl text-base font-semibold hover:bg-gold2 transition shadow-[0_0_30px_rgba(201,167,125,0.2)]">
              Générer mon premier chapitre →
            </a>
            <a href="#comment"
              className="border border-border text-cream px-8 py-4 rounded-xl text-base font-medium hover:border-gold/30 hover:bg-surface transition">
              Voir comment ça marche
            </a>
          </div>
          <p className="text-xs text-muted2 mt-5">Premier chapitre gratuit — sans carte bancaire</p>
        </div>
      </section>

      {/* Séparateur décoratif */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Comment ça marche */}
      <section id="comment" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-cream mb-3">Comment ça marche</h2>
            <p className="text-muted">Six étapes, de ta voix à ton livre</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { n: '01', titre: 'Ton profil auteur', desc: 'Réponds à un questionnaire. Le Scribe apprend ta voix, ton style, ton niveau théologique.' },
              { n: '02', titre: 'Ton projet livre', desc: 'Définis le sujet, la cible, et colle tes liens YouTube ou notes de prédication.' },
              { n: '03', titre: 'Le plan généré', desc: 'Le Scribe propose un plan complet chapitre par chapitre. Tu valides ou ajustes.' },
              { n: '04', titre: "L'écriture guidée", desc: 'Chapitre par chapitre, dans ta voix. Tu relis, tu corriges, tu valides.' },
              { n: '05', titre: 'Validation continue', desc: "Rien n'avance sans ton accord. Tu restes l'auteur à chaque étape." },
              { n: '06', titre: 'Export et publication', desc: 'Exporte vers Word. Prêt pour Amazon KDP ou tout autre éditeur.' },
            ].map(({ n, titre, desc }) => (
              <div key={n} className="p-7 rounded-2xl border border-border bg-surface hover:border-gold/20 transition group">
                <div className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-gold/20 mb-4 group-hover:text-gold/30 transition">{n}</div>
                <h3 className="font-semibold text-cream mb-2">{titre}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Séparateur */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Tarifs */}
      <section id="tarifs" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-cream mb-3">Tarifs simples</h2>
            <p className="text-muted">Commence gratuitement, paie quand tu es convaincu</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {/* Gratuit */}
            <div className="p-7 rounded-2xl border border-border bg-surface">
              <div className="text-xs text-muted uppercase tracking-widest mb-2">Pour tester</div>
              <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream mb-1">Découverte</div>
              <div className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-cream mb-7">Gratuit</div>
              <ul className="space-y-2.5 mb-8">
                {['1 chapitre offert', 'Profil auteur complet', 'Sans carte bancaire'].map(f => (
                  <li key={f} className="text-sm text-muted flex items-center gap-2">
                    <span className="text-gold text-xs">✦</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/inscription" className="block text-center py-3 rounded-lg text-sm font-medium border border-border text-cream hover:border-gold/30 hover:bg-surface2 transition">
                Commencer
              </a>
            </div>

            {/* Par livre */}
            <div className="p-7 rounded-2xl border border-gold/40 bg-surface relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <div className="text-xs text-gold uppercase tracking-widest mb-2">Paiement unique</div>
              <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream mb-1">Par livre</div>
              <div className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-gold mb-7">59€</div>
              <ul className="space-y-2.5 mb-8">
                {['1 livre complet', 'Chapitres illimités', 'Export Word / DOCX'].map(f => (
                  <li key={f} className="text-sm text-cream2 flex items-center gap-2">
                    <span className="text-gold text-xs">✦</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/inscription" className="block text-center py-3 rounded-lg text-sm font-medium bg-gold text-bg hover:bg-gold2 transition">
                Commencer
              </a>
            </div>

            {/* Forfait */}
            <div className="p-7 rounded-2xl border border-border bg-surface">
              <div className="text-xs text-muted uppercase tracking-widest mb-2">3 mois / 5 livres</div>
              <div className="flex items-center gap-2 mb-1">
                <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream">Forfait</div>
                <span className="text-xs font-semibold bg-ok/10 text-ok border border-ok/20 px-2 py-0.5 rounded-full">-46%</span>
              </div>
              <div className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-cream mb-1">159€</div>
              <div className="text-xs text-ok mb-6">Économise 136€ vs le tarif au livre</div>
              <ul className="space-y-2.5 mb-8">
                {['5 livres max', '31,80€ / livre', 'Support dédié'].map(f => (
                  <li key={f} className="text-sm text-muted flex items-center gap-2">
                    <span className="text-gold text-xs">✦</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/inscription" className="block text-center py-3 rounded-lg text-sm font-medium border border-border text-cream hover:border-gold/30 hover:bg-surface2 transition">
                Commencer
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="tutos" className="border-t border-border py-10 px-6 text-center">
        <div className="font-[family-name:var(--font-playfair)] text-gold text-lg font-bold mb-2">Le Scribe</div>
        <p className="text-xs text-muted2">© 2025 Le Scribe — Conçu pour les pasteurs et auteurs chrétiens francophones</p>
      </footer>
    </main>
  )
}

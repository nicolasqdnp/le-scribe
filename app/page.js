export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✍️</span>
          <span className="text-xl font-semibold text-stone-800">Le Scribe</span>
        </div>
        <div className="flex gap-3">
          <a href="/login" className="text-sm text-stone-600 hover:text-stone-800 px-4 py-2">Connexion</a>
          <a href="/inscription" className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700">Commencer gratuitement</a>
        </div>
      </header>
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-violet-100 text-violet-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">Pour les pasteurs et auteurs chrétiens</div>
        <h1 className="text-5xl font-bold text-stone-900 leading-tight mb-6">Transforme tes prédications<br />en livre publié</h1>
        <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">Le Scribe analyse ta voix, extrait tes transcriptions YouTube et t'accompagne chapitre par chapitre — dans ton style, avec ta voix.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/inscription" className="bg-violet-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-violet-700 transition">Générer mon premier chapitre →</a>
          <a href="#comment" className="border border-stone-300 text-stone-700 px-8 py-4 rounded-xl text-lg font-medium hover:bg-stone-100 transition">Voir comment ça marche</a>
        </div>
        <p className="text-sm text-stone-400 mt-4">Premier chapitre gratuit — sans carte bancaire</p>
      </section>
      <section id="comment" className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-stone-900 text-center mb-4">Comment ça marche</h2>
          <p className="text-stone-500 text-center mb-14">Six étapes simples, de ta voix à ton livre</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-stone-100 bg-stone-50"><div className="text-3xl font-bold text-violet-200 mb-3">01</div><h3 className="font-semibold text-stone-800 mb-2">Ton profil auteur</h3><p className="text-sm text-stone-500 leading-relaxed">Réponds à un questionnaire simple. Le Scribe apprend ta voix, ton style, ton niveau théologique.</p></div>
            <div className="p-6 rounded-xl border border-stone-100 bg-stone-50"><div className="text-3xl font-bold text-violet-200 mb-3">02</div><h3 className="font-semibold text-stone-800 mb-2">Ton projet livre</h3><p className="text-sm text-stone-500 leading-relaxed">Définis le sujet, la cible, et colle tes liens YouTube ou notes de prédication.</p></div>
            <div className="p-6 rounded-xl border border-stone-100 bg-stone-50"><div className="text-3xl font-bold text-violet-200 mb-3">03</div><h3 className="font-semibold text-stone-800 mb-2">Le plan généré</h3><p className="text-sm text-stone-500 leading-relaxed">Le Scribe propose un plan complet chapitre par chapitre. Tu valides ou ajustes.</p></div>
            <div className="p-6 rounded-xl border border-stone-100 bg-stone-50"><div className="text-3xl font-bold text-violet-200 mb-3">04</div><h3 className="font-semibold text-stone-800 mb-2">L'écriture guidée</h3><p className="text-sm text-stone-500 leading-relaxed">Chapitre par chapitre, dans ta voix. Tu relis, tu corriges, tu valides.</p></div>
            <div className="p-6 rounded-xl border border-stone-100 bg-stone-50"><div className="text-3xl font-bold text-violet-200 mb-3">05</div><h3 className="font-semibold text-stone-800 mb-2">Validation continue</h3><p className="text-sm text-stone-500 leading-relaxed">Rien n'avance sans ton accord. Tu restes l'auteur à chaque étape.</p></div>
            <div className="p-6 rounded-xl border border-stone-100 bg-stone-50"><div className="text-3xl font-bold text-violet-200 mb-3">06</div><h3 className="font-semibold text-stone-800 mb-2">Export et publication</h3><p className="text-sm text-stone-500 leading-relaxed">Exporte vers Word ou Google Docs. Prêt pour Amazon KDP ou tout autre éditeur.</p></div>
          </div>
        </div>
      </section>
      <section className="py-20 px-6 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-stone-900 text-center mb-4">Tarifs simples</h2>
          <p className="text-stone-500 text-center mb-14">Commence gratuitement, paie quand tu es convaincu</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-stone-200 bg-white"><div className="text-sm font-medium text-stone-400 mb-1">Pour tester</div><div className="text-2xl font-bold text-stone-900 mb-1">Découverte</div><div className="text-3xl font-bold text-stone-900 mb-6">Gratuit</div><ul className="space-y-2 mb-8"><li className="text-sm text-stone-600 flex items-center gap-2"><span>✓</span> 1 chapitre offert</li><li className="text-sm text-stone-600 flex items-center gap-2"><span>✓</span> Profil auteur complet</li><li className="text-sm text-stone-600 flex items-center gap-2"><span>✓</span> Sans carte bancaire</li></ul><a href="/inscription" className="block text-center py-3 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition">Commencer</a></div>
            <div className="p-6 rounded-xl border border-violet-400 bg-violet-600 text-white"><div className="text-sm font-medium text-violet-200 mb-1">Paiement unique</div><div className="text-2xl font-bold mb-1">Par livre</div><div className="text-3xl font-bold mb-6">59€</div><ul className="space-y-2 mb-8"><li className="text-sm text-violet-100 flex items-center gap-2"><span>✓</span> 1 livre complet</li><li className="text-sm text-violet-100 flex items-center gap-2"><span>✓</span> Chapitres illimités</li><li className="text-sm text-violet-100 flex items-center gap-2"><span>✓</span> Export Word / Google Docs</li></ul><a href="/inscription" className="block text-center py-3 rounded-lg text-sm font-medium bg-white text-violet-600 hover:bg-violet-50 transition">Commencer</a></div>
            <div className="p-6 rounded-xl border border-stone-200 bg-white"><div className="text-sm font-medium text-stone-400 mb-1">3 mois / 5 livres</div><div className="text-2xl font-bold text-stone-900 mb-1">Forfait</div><div className="text-3xl font-bold text-stone-900 mb-6">99€</div><ul className="space-y-2 mb-8"><li className="text-sm text-stone-600 flex items-center gap-2"><span>✓</span> 5 livres max</li><li className="text-sm text-stone-600 flex items-center gap-2"><span>✓</span> Priorité de traitement</li><li className="text-sm text-stone-600 flex items-center gap-2"><span>✓</span> Support dédié</li></ul><a href="/inscription" className="block text-center py-3 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition">Commencer</a></div>
          </div>
        </div>
      </section>
      <footer className="bg-white border-t border-stone-200 py-8 px-6 text-center text-sm text-stone-400">© 2025 Le Scribe — Conçu pour les pasteurs et auteurs chrétiens francophones</footer>
    </main>
  )
}

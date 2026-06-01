'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function MerciContent() {
  const params = useSearchParams()
  const product = params.get('product')

  const isEpub = product === 'epub'

  return (
    <main className="min-h-screen page-glow flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-6">{isEpub ? '📖' : '📦'}</div>

        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-cream mb-4">
          {isEpub ? 'Merci pour ton achat !' : 'Précommande confirmée !'}
        </h1>

        {isEpub ? (
          <p className="text-cream2 text-sm leading-relaxed mb-8">
            Un email avec le lien de téléchargement de ton EPUB arrive dans quelques minutes.
            Pense à vérifier tes spams si tu ne le reçois pas.
          </p>
        ) : (
          <p className="text-cream2 text-sm leading-relaxed mb-8">
            Ta précommande est enregistrée. Dès que l'impression est prête,
            ton livre sera expédié à l'adresse indiquée. Tu recevras un email de confirmation.
          </p>
        )}

        <div className="bg-surface border border-border rounded-2xl p-5 mb-8 text-left">
          <p className="text-xs text-muted uppercase tracking-widest font-medium mb-3">
            {isEpub ? 'Ton achat' : 'Ta précommande'}
          </p>
          <p className="text-cream font-[family-name:var(--font-playfair)] font-bold mb-1">
            L'urgence des temps
          </p>
          <p className="text-muted text-xs">Nicolas Salafranque · Éditions Le Scribe</p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="https://lescribe.app"
            className="bg-gold text-bg font-semibold text-sm px-6 py-3 rounded-xl hover:bg-gold2 transition">
            Découvrir Le Scribe →
          </a>
          <a href="/boutique" className="text-sm text-muted hover:text-cream transition">
            ← Retour à la boutique
          </a>
        </div>
      </div>
    </main>
  )
}

export default function MerciPage() {
  return (
    <Suspense>
      <MerciContent />
    </Suspense>
  )
}

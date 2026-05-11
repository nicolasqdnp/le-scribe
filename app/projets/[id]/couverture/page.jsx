'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase'

export default function CouverturePage() {
  const { id } = useParams()
  const [projet, setProjet] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [descriptionCustom, setDescriptionCustom] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('projets_livres')
        .select('titre, sujet')
        .eq('id', id)
        .single()
      if (data) {
        setProjet(data)
        setDescriptionCustom(data.sujet || '')
      }
    }
    load()
  }, [id])

  async function generer() {
    setLoading(true)
    setError('')
    setImages([])
    try {
      const res = await fetch('/api/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: projet?.titre, sujet: descriptionCustom }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setImages(data.images || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const canvaUrl = `https://www.canva.com/create/book-covers/`

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projets/${id}`} className="text-stone-400 hover:text-stone-700 transition">←</Link>
          <span className="text-sm font-medium text-stone-700 truncate max-w-xs">{projet?.titre || '…'}</span>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">Couverture</span>
        </div>
        <a
          href={canvaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-[#7D2AE8] text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-medium flex items-center gap-2">
          <span>🎨</span> Finir dans Canva
        </a>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-stone-900 mb-1">
            Générateur de couverture
          </h1>
          <p className="text-sm text-stone-500">
            Génère 3 visuels IA à partir du thème de ton livre. Télécharge celui que tu préfères, puis finalise avec Canva (titre, auteur, typographie).
          </p>
        </div>

        {/* Champ description */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-widest mb-2">
            Thème / atmosphère souhaitée
          </label>
          <textarea
            value={descriptionCustom}
            onChange={e => setDescriptionCustom(e.target.value)}
            rows={3}
            placeholder="Ex : livre sur la foi et la grâce, ton spirituel, lumière et espoir…"
            className="w-full text-sm text-stone-800 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition resize-none"
          />
          <button
            onClick={generer}
            disabled={loading || !projet}
            className="mt-4 w-full bg-gold text-bg py-3 rounded-xl text-sm font-semibold hover:bg-gold2 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Génération en cours… (30-60s)
              </>
            ) : '✦ Générer 3 visuels'}
          </button>
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </div>

        {/* Résultats */}
        {images.length > 0 && (
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">Visuels générés — clique pour télécharger</p>
            <div className="grid grid-cols-3 gap-4">
              {images.map((url, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                  <img src={url} alt={`Couverture ${i + 1}`} className="w-full aspect-[2/3] object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a
                      href={url}
                      download={`couverture-${i + 1}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-white text-stone-900 px-3 py-1.5 rounded-lg font-medium hover:bg-stone-100 transition">
                      ↓ Télécharger
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-[#7D2AE8]/5 border border-[#7D2AE8]/20 rounded-xl flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-800">Finir la couverture dans Canva</p>
                <p className="text-xs text-stone-500 mt-0.5">Ajoute le titre, ton nom et la typographie par-dessus ton visuel.</p>
              </div>
              <a
                href={canvaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-xs bg-[#7D2AE8] text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-medium">
                Ouvrir Canva →
              </a>
            </div>
          </div>
        )}

        {/* État vide */}
        {images.length === 0 && !loading && (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-4 opacity-30">🎨</div>
            <p className="text-sm">Clique sur "Générer" pour créer tes visuels de couverture.</p>
            <p className="text-xs mt-2 opacity-70">3 propositions · Format portrait · Optimisé pour KDP</p>
          </div>
        )}
      </div>
    </main>
  )
}

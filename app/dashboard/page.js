'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

function ProfileCard({ portrait }) {
  return (
    <Link href="/profil" className="block p-7 bg-surface border border-border rounded-2xl hover:border-gold/30 transition group">
      <div className="flex items-start justify-between mb-4">
        <div className="text-xs text-gold uppercase tracking-widest font-medium">Profil analysé</div>
        <span className="text-xs bg-gold/10 text-gold px-2.5 py-0.5 rounded-full border border-gold/20">✦ Actif</span>
      </div>
      <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-cream mb-3 group-hover:text-gold transition">
        Mon profil auteur
      </h2>
      <p className="text-sm text-muted leading-relaxed line-clamp-3 italic">"{portrait.resume}"</p>
      {portrait.forces_stylistiques?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {portrait.forces_stylistiques.slice(0, 2).map((f, i) => (
            <span key={i} className="text-xs bg-surface2 text-muted2 px-2.5 py-1 rounded-full border border-border">{f}</span>
          ))}
        </div>
      )}
      <p className="text-xs text-gold mt-4 group-hover:text-gold2 transition">Voir mon portrait →</p>
    </Link>
  )
}

function statutLabel(statut) {
  const map = { nouveau: 'Nouveau', analyse_en_cours: 'Analyse…', plan_propose: 'Plan généré', redaction: 'En rédaction', termine: 'Terminé' }
  return map[statut] || statut
}

function statutColor(statut) {
  if (statut === 'termine') return 'bg-ok/10 text-ok border-ok/20'
  if (statut === 'redaction' || statut === 'plan_propose') return 'bg-gold/10 text-gold border-gold/20'
  if (statut === 'analyse_en_cours') return 'bg-warn/10 text-warn border-warn/20'
  return 'bg-surface2 text-muted border-border'
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [portrait, setPortrait] = useState(null)
  const [projets, setProjets] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const authTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 8000))
        const { data: { user } } = await Promise.race([supabase.auth.getUser(), authTimeout])
        if (!user) { router.push('/login'); return }
        setUser(user)

        const [{ data: analysis }, { data: projetsData }, { data: chapitresData }] = await Promise.all([
          supabase.from('author_profile_analyses').select('portrait').eq('user_id', user.id).maybeSingle(),
          supabase.from('projets_livres').select('id, titre, sujet, statut, nb_chapitres, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('chapitres').select('projet_id, numero, statut').eq('user_id', user.id)
        ])

        if (analysis?.portrait) setPortrait(analysis.portrait)

        const chapParProjet = {}
        for (const ch of chapitresData || []) {
          if (!chapParProjet[ch.projet_id]) chapParProjet[ch.projet_id] = []
          chapParProjet[ch.projet_id].push(ch)
        }

        const projetsAvecProgression = (projetsData || []).map(proj => {
          const chaps = chapParProjet[proj.id] || []
          const reguliers = chaps.filter(c => c.numero > 0 && c.numero < 998)
          const intro = chaps.find(c => c.numero === 0)
          const conclusion = chaps.find(c => c.numero === 999)
          const total = reguliers.length + 2
          const valides =
            reguliers.filter(c => c.statut === 'valide').length +
            (intro?.statut === 'valide' ? 1 : 0) +
            (conclusion?.statut === 'valide' ? 1 : 0)
          const pct = total > 2 ? Math.round((valides / total) * 100) : 0
          return { ...proj, progression: pct, chapCount: reguliers.length }
        })

        setProjets(projetsAvecProgression)
      } catch (e) {
        console.error('Erreur chargement dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function deleteProjet(projetId) {
    setConfirmId(null)
    setDeletingId(projetId)
    const supabase = createClient()
    await supabase.from('chapitres').delete().eq('projet_id', projetId)
    await supabase.from('chat_messages').delete().eq('projet_id', projetId)
    await supabase.from('sources').delete().eq('projet_id', projetId)
    await supabase.from('projets_livres').delete().eq('id', projetId)
    setProjets(prev => prev.filter(p => p.id !== projetId))
    setDeletingId(null)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen page-glow flex items-center justify-center">
      <p className="text-muted text-sm">Chargement…</p>
    </main>
  )

  return (
    <main className="min-h-screen page-glow">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-gold">Le Scribe</Link>
        <div className="flex items-center gap-5">
          <span className="text-sm text-muted">{user?.user_metadata?.nom || user?.email}</span>
          <button onClick={handleLogout} className="text-xs text-muted hover:text-cream border border-border rounded-lg px-3 py-1.5 transition">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-cream mb-1">
            Bonjour {user?.user_metadata?.nom?.split(' ')[0] || 'Auteur'}
          </h1>
          <p className="text-muted">Que veux-tu faire aujourd'hui ?</p>
        </div>

        {/* Actions principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {portrait ? (
            <ProfileCard portrait={portrait} />
          ) : (
            <Link href="/profil" className="block p-7 bg-surface border border-border rounded-2xl hover:border-gold/30 transition group">
              <div className="text-xs text-muted uppercase tracking-widest mb-4">À compléter</div>
              <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-cream mb-2 group-hover:text-gold transition">
                Mon profil auteur
              </h2>
              <p className="text-sm text-muted">Configure ton style pour que l'IA écrive vraiment comme toi.</p>
              <p className="text-xs text-gold mt-4">Créer mon profil →</p>
            </Link>
          )}

          <Link href="/nouveau-livre" className="block p-7 bg-surface border border-gold/20 rounded-2xl hover:border-gold/50 transition group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
            <div className="text-xs text-gold uppercase tracking-widest mb-4">Nouveau projet</div>
            <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-cream mb-2 group-hover:text-gold transition">
              Nouveau livre
            </h2>
            <p className="text-sm text-muted">Fournis tes sources et laisse l'IA générer un plan, puis rédige chapitre par chapitre.</p>
            <p className="text-xs text-gold mt-4">Commencer →</p>
          </Link>
        </div>

        {/* Projets en cours */}
        <div>
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-cream mb-5">Mes livres</h2>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {projets.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <div className="text-4xl mb-4 opacity-20">📚</div>
                <p className="text-sm mb-4">Aucun livre pour le moment.</p>
                <Link href="/nouveau-livre" className="text-xs text-gold hover:text-gold2 transition">Commencer mon premier livre →</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {projets.map(proj => (
                  <div key={proj.id} className="relative group hover:bg-surface2 transition">
                    <Link href={`/projets/${proj.id}`} className="flex items-center justify-between px-6 py-5 gap-4 pr-24">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-cream group-hover:text-gold transition truncate">{proj.titre || 'Sans titre'}</div>
                        {proj.sujet && <div className="text-xs text-muted mt-0.5 line-clamp-1">{proj.sujet}</div>}
                        <div className="mt-2.5">
                          {proj.chapCount > 0 ? (
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-1 bg-surface3 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${proj.progression === 100 ? 'bg-ok' : 'bg-gold'}`}
                                  style={{ width: `${proj.progression}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${proj.progression === 100 ? 'text-ok' : 'text-gold'}`}>
                                {proj.progression === 100 ? '✓ Terminé' : `${proj.progression} %`}
                              </span>
                            </div>
                          ) : (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statutColor(proj.statut)}`}>
                              {statutLabel(proj.statut)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {proj.chapCount > 0 && (
                          <span
                            onClick={e => { e.preventDefault(); window.location.href = `/projets/${proj.id}/edition` }}
                            className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted hover:border-gold/30 hover:text-gold transition">
                            Mise en forme
                          </span>
                        )}
                        <span className="text-muted group-hover:text-gold transition text-sm">→</span>
                      </div>
                    </Link>

                    {/* Bouton suppression */}
                    <button
                      onClick={e => { e.preventDefault(); setConfirmId(proj.id) }}
                      disabled={deletingId === proj.id}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted2 hover:text-err hover:bg-err/10 transition disabled:opacity-40 opacity-0 group-hover:opacity-100">
                      {deletingId === proj.id ? <span className="text-xs">…</span> : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>

                    {confirmId === proj.id && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10 bg-surface border border-border rounded-xl shadow-2xl p-4 w-56">
                        <p className="text-sm text-cream font-medium mb-3">Supprimer définitivement ?</p>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setConfirmId(null)} className="text-xs text-muted hover:text-cream px-3 py-1.5 rounded-lg border border-border hover:border-border2 transition">Annuler</button>
                          <button onClick={() => deleteProjet(proj.id)} className="text-xs bg-err/80 text-white px-3 py-1.5 rounded-lg hover:bg-err transition">Supprimer</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

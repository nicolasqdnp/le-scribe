'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'

function NoteEditoriale({ note }) {
  const [open, setOpen] = useState(false)
  const phrases = note.split(/(?<=[.!])\s+/).filter(s => s.trim().length > 10)
  return (
    <div className="border-t border-border">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface2 transition group">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-widest">Note éditoriale</p>
          <p className="text-xs text-muted2 mt-0.5">{open ? 'Cliquer pour fermer' : 'Cliquer pour lire'}</p>
        </div>
        <span className={`text-gold text-sm transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <ul className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto">
          {phrases.map((phrase, i) => (
            <li key={i} className="text-xs text-muted leading-relaxed flex gap-1.5">
              <span className="text-gold/40 flex-shrink-0 mt-0.5">·</span>
              <span>{phrase.trim()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AnalyseEnCours({ projetId }) {
  const [sources, setSources] = useState([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [transcribing, setTranscribing] = useState(null)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planError, setPlanError] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const supabase = createClient()
    supabase.from('sources')
      .select('id, label, url, contenu_brut, type, ordre')
      .eq('projet_id', projetId).eq('usage', 'book_source')
      .order('ordre', { ascending: true })
      .then(({ data }) => { setSources(data || []); setLoadingSources(false) })
  }, [projetId])

  const ytSources = sources.filter(s => s.type === 'youtube')
  const allTranscribed = ytSources.length > 0 && ytSources.every(s => s.contenu_brut)
  const nextToTranscribe = ytSources.find(s => !s.contenu_brut)

  async function transcrire(source) {
    setTranscribing(source.id); setErrors(prev => ({ ...prev, [source.id]: null }))
    try {
      const res = await fetch('/api/fetch-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId: source.id }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, contenu_brut: 'done' } : s))
    } catch (e) { setErrors(prev => ({ ...prev, [source.id]: e.message })) }
    setTranscribing(null)
  }

  async function genererPlan() {
    setGeneratingPlan(true); setPlanError('')
    try {
      const res = await fetch('/api/analyze-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projetId }) })
      const text = await res.text(); let json
      try { json = JSON.parse(text) } catch { throw new Error('Réponse invalide du serveur : ' + text.slice(0, 200)) }
      if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
      window.location.reload()
    } catch (e) { setPlanError(e.message); setGeneratingPlan(false) }
  }

  if (loadingSources) return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-muted text-sm">Chargement…</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface px-6 py-4">
        <Link href="/dashboard" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-gold">Le Scribe</Link>
      </header>
      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream mb-2">Préparer les sources</h1>
        <p className="text-muted text-sm mb-8">Transcris chaque vidéo une par une, puis génère le plan du livre.</p>

        <div className="space-y-3 mb-8">
          {ytSources.map((source, i) => {
            const done = !!source.contenu_brut
            const isLoading = transcribing === source.id
            const err = errors[source.id]
            const isNext = !done && source.id === nextToTranscribe?.id
            return (
              <div key={source.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${done ? 'border-ok/30 bg-ok/5' : 'border-border bg-surface'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${done ? 'bg-ok/10 text-ok border-ok/20' : 'bg-surface2 text-muted border-border'}`}>
                      {done ? '✓ Transcrite' : `Vidéo ${i + 1}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted2 mt-1 truncate">{source.url}</p>
                  {err && <p className="text-xs text-err mt-1">{err}</p>}
                </div>
                {!done && (
                  <button onClick={() => transcrire(source)} disabled={!!transcribing || !isNext}
                    className="flex-shrink-0 text-sm bg-gold text-bg px-4 py-2 rounded-lg hover:bg-gold2 transition disabled:opacity-40 font-medium">
                    {isLoading ? '⏳ En cours…' : 'Transcrire →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {(allTranscribed || ytSources.length === 0) && (
          <div className="rounded-xl border border-gold/20 bg-gold/5 p-6 text-center">
            <p className="text-sm text-stone-700 font-medium mb-4">
              {ytSources.length === 0 ? 'Aucune vidéo YouTube — génère directement le plan.' : '✓ Toutes les vidéos sont transcrites. L\'IA peut maintenant générer le plan.'}
            </p>
            {planError && (
              <div className="mb-4 bg-err/10 border border-err/20 rounded-lg px-4 py-3 text-left">
                <p className="text-xs font-semibold text-err mb-1">Erreur :</p>
                <p className="text-xs text-err/80 break-words">{planError}</p>
              </div>
            )}
            <button onClick={genererPlan} disabled={generatingPlan}
              className="bg-gold text-bg px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold2 transition disabled:opacity-50">
              {generatingPlan ? '⏳ Génération du plan…' : '✦ Générer le plan du livre →'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ProjetPage() {
  const { id } = useParams()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [projet, setProjet] = useState(null)
  const [chapitres, setChapitres] = useState([])
  const [chapitreActif, setChapitreActif] = useState(null)
  const [contenu, setContenu] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState('gratuit')
  const [chapitresGeneresTotal, setChapitresGeneresTotal] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [improving, setImproving] = useState(false)
  const [generatingExtras, setGeneratingExtras] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [indexingDone, setIndexingDone] = useState(false)
  const [extras, setExtras] = useState(null)
  const [extrasIntegres, setExtrasIntegres] = useState(false)
  const [integrating, setIntegrating] = useState(false)
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [addForm, setAddForm] = useState({ titre: '', sourceType: 'youtube', sourceUrl: '', sourceText: '' })
  const [addFile, setAddFile] = useState(null)
  const [addLoading, setAddLoading] = useState(false)
  const [addTranscribing, setAddTranscribing] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showFinishBanner, setShowFinishBanner] = useState(false)
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const authTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 8000))
        const { data: { user } } = await Promise.race([supabase.auth.getUser(), authTimeout])
        if (!user) { router.replace('/login'); return }
        setUser(user)
        const [{ data: proj }, { data: chaps }, { data: planData }, { count: genCount }] = await Promise.all([
          supabase.from('projets_livres').select('*').eq('id', id).eq('user_id', user.id).single(),
          supabase.from('chapitres').select('*').eq('projet_id', id).order('numero', { ascending: true }),
          supabase.from('user_plans').select('plan').eq('user_id', user.id).maybeSingle(),
          supabase.from('chapitres').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('contenu_ia', 'is', null)
        ])
        if (!proj) { router.replace('/dashboard'); return }
        setProjet(proj); setChapitres(chaps || [])
        setUserPlan(planData?.plan || 'gratuit')
        setChapitresGeneresTotal(genCount || 0)
        if (chaps?.length > 0) {
          const premier = chaps[0]
          setChapitreActif(premier); setContenu(premier.contenu_final || premier.contenu_ia || '')
          setExtras(premier.extras || null); loadChat(supabase, id, premier.id)
        }
      } catch (e) {
        console.error('Erreur chargement projet:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  async function loadChat(supabase, projetId, chapitreId) {
    const { data } = await supabase.from('chat_messages').select('role, contenu')
      .eq('projet_id', projetId).eq('chapitre_id', chapitreId)
      .order('created_at', { ascending: true }).limit(30)
    setChatMessages(data || [])
  }

  async function selectChapitre(ch) {
    if (chapitreActif?.id === ch.id) return
    if (saving) return
    await saveCurrent()
    setChapitreActif(ch); setContenu(ch.contenu_final || ch.contenu_ia || '')
    setExtras(ch.extras || null); setExtrasIntegres(false)
    const supabase = createClient(); loadChat(supabase, id, ch.id)
  }

  async function saveCurrent() {
    if (!chapitreActif || !contenu) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('chapitres').update({ contenu_final: contenu, updated_at: new Date().toISOString() }).eq('id', chapitreActif.id)
    setSaving(false)
  }

  async function validerChapitre() {
    await saveCurrent()
    const supabase = createClient()
    await supabase.from('chapitres').update({ contenu_final: contenu, statut: 'valide', updated_at: new Date().toISOString() }).eq('id', chapitreActif.id)
    const updated = chapitres.map(c => c.id === chapitreActif.id ? { ...c, statut: 'valide', contenu_final: contenu } : c)
    setChapitres(updated); setChapitreActif(prev => ({ ...prev, statut: 'valide', contenu_final: contenu }))
    const regular = updated.filter(c => c.numero > 0 && c.numero < 999)
    const allDone = regular.length > 0 && regular.every(c => c.statut === 'valide')
    if (allDone) {
      const intro = updated.find(c => c.numero === 0); const conclusion = updated.find(c => c.numero === 999)
      if (!intro || intro.statut === 'vide' || !conclusion || conclusion.statut === 'vide') setShowFinishBanner(true)
      else { const supabase = createClient(); await supabase.from('projets_livres').update({ statut: 'termine' }).eq('id', id); setProjet(prev => prev ? { ...prev, statut: 'termine' } : prev) }
    }
  }

  async function goCheckout(plan) {
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else alert('Erreur : ' + (json.error || 'Impossible de créer la session de paiement'))
    } catch (e) { alert('Erreur : ' + e.message) }
    setCheckoutLoading(null)
  }

  async function genererChapitre() {
    if (!chapitreActif) return
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapitreId: chapitreActif.id }) })
      const json = await res.json()
      if (res.status === 402) { setShowPaywall(true); setGenerating(false); return }
      if (!res.ok) throw new Error(json.error)
      setContenu(json.contenu)
      setChapitres(prev => prev.map(c => c.id === chapitreActif.id ? { ...c, statut: 'genere', contenu_ia: json.contenu } : c))
      setChapitreActif(prev => ({ ...prev, statut: 'genere', contenu_ia: json.contenu }))
    } catch (e) { alert('Erreur génération : ' + e.message) }
    setGenerating(false)
  }

  async function genererExtras() {
    if (!chapitreActif) return
    setGeneratingExtras(true)
    try {
      const res = await fetch('/api/generate-extras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapitreId: chapitreActif.id }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setExtras(json.extras)
    } catch (e) { alert('Erreur : ' + e.message) }
    setGeneratingExtras(false)
  }

  async function ameliorerChapitre() {
    if (!chapitreActif) return
    setImproving(true)
    try {
      const res = await fetch('/api/improve-chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapitreId: chapitreActif.id, contenuActuel: contenu }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setContenu(json.contenu)
      setChapitres(prev => prev.map(c => c.id === chapitreActif.id ? { ...c, statut: 'genere', contenu_ia: json.contenu } : c))
      setChapitreActif(prev => ({ ...prev, statut: 'genere', contenu_ia: json.contenu }))
    } catch (e) { alert('Erreur : ' + e.message) }
    setImproving(false)
  }

  async function deleteChapter(chapId) {
    setConfirmDeleteId(null)
    const supabase = createClient()
    await supabase.from('chapitres').delete().eq('id', chapId)
    const ch = chapitres.find(c => c.id === chapId)
    if (ch && projet?.plan_ia) {
      const newPlan = { ...projet.plan_ia, chapitres: (projet.plan_ia.chapitres || []).filter(c => c.numero !== ch.numero) }
      await supabase.from('projets_livres').update({ plan_ia: newPlan }).eq('id', id)
      setProjet(prev => ({ ...prev, plan_ia: newPlan }))
    }
    setChapitres(prev => prev.filter(c => c.id !== chapId))
    if (chapitreActif?.id === chapId) { setChapitreActif(null); setContenu('') }
  }

  async function indexerSources() {
    setIndexing(true)
    try {
      const supabase = createClient()
      const { data: sources } = await supabase.from('sources').select('id, label').eq('projet_id', id).eq('usage', 'book_source').not('contenu_brut', 'is', null)
      if (!sources?.length) { setIndexingDone(true); setIndexing(false); return }
      for (const source of sources) {
        await fetch('/api/embed-source', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId: source.id }) })
      }
      setIndexingDone(true)
    } catch (e) { alert('Erreur : ' + e.message) }
    setIndexing(false)
  }

  async function addChapter() {
    if (!addForm.titre.trim()) return
    setAddLoading(true)
    try {
      let res, json
      if (addForm.sourceType === 'pdf' || addForm.sourceType === 'docx') {
        const fd = new FormData(); fd.append('projetId', id); fd.append('titre', addForm.titre); fd.append('sourceType', addForm.sourceType)
        if (addFile) fd.append('file', addFile)
        res = await fetch('/api/add-chapter', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/add-chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projetId: id, titre: addForm.titre, sourceType: addForm.sourceType, sourceUrl: addForm.sourceUrl, sourceText: addForm.sourceText }) })
      }
      json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const newCh = json.chapitre
      setChapitres(prev => { const withoutConclusion = prev.filter(c => c.numero !== 999); const conclusion = prev.find(c => c.numero === 999); return conclusion ? [...withoutConclusion, newCh, conclusion] : [...withoutConclusion, newCh] })
      setProjet(prev => prev ? { ...prev, plan_ia: { ...(prev.plan_ia || {}), chapitres: [...((prev.plan_ia?.chapitres) || []), { numero: newCh.numero, titre: newCh.titre, message_central: '', points_cles: [], versets_suggeres: [], resume: '' }] } } : prev)
      if (json.needsTranscription && json.sourceId) { setAddLoading(false); setAddTranscribing({ sourceId: json.sourceId, chapitreId: newCh.id }); return }
      setShowAddChapter(false); setAddForm({ titre: '', sourceType: 'youtube', sourceUrl: '', sourceText: '' }); setAddFile(null)
      selectChapitre(newCh)
    } catch (e) { alert('Erreur : ' + e.message) }
    setAddLoading(false)
  }

  async function transcribeNewSource() {
    if (!addTranscribing) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/fetch-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId: addTranscribing.sourceId }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const ch = chapitres.find(c => c.id === addTranscribing.chapitreId)
      setShowAddChapter(false); setAddTranscribing(null); setAddForm({ titre: '', sourceType: 'youtube', sourceUrl: '', sourceText: '' })
      if (ch) selectChapitre(ch)
    } catch (e) { alert('Erreur transcription : ' + e.message) }
    setAddLoading(false)
  }

  async function sendChat(overrideMsg) {
    const override = typeof overrideMsg === 'string' ? overrideMsg : null
    const msg = override || chatInput.trim()
    if (!msg || chatLoading) return
    if (!override) { setChatInput(''); if (chatInputRef.current) chatInputRef.current.style.height = 'auto'; setChatMessages(prev => [...prev, { role: 'user', contenu: msg }]) }
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat-project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projetId: id, chapitreId: chapitreActif?.id, message: msg }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setChatMessages(prev => [...prev, { role: 'assistant', contenu: json.reply }])
    } catch (e) {
      const isOverloaded = e.message?.includes('surchargée') || e.message?.includes('overloaded')
      setChatMessages(prev => [...prev, { role: 'assistant', contenu: '⚠ ' + e.message, retryMsg: isOverloaded ? msg : null }])
    }
    setChatLoading(false)
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  useEffect(() => {
    document.querySelectorAll('textarea[data-autoresize]').forEach(ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px' })
  }, [extras])

  function statutBadge(statut) {
    const map = {
      vide: ['bg-stone-100 text-stone-500 border-stone-200', 'À rédiger'],
      en_cours: ['bg-warn/10 text-warn border-warn/20', 'En cours'],
      genere: ['bg-gold/10 text-gold border-gold/20', 'Généré'],
      valide: ['bg-ok/10 text-ok border-ok/20', '✓ Validé']
    }
    const [cls, label] = map[statut] || map.vide
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cls}`}>{label}</span>
  }

  const plan = projet?.plan_ia
  const isLocked = (ch) => userPlan === 'gratuit' && ch?.numero !== 1

  if (loading) return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-muted text-sm">Chargement du projet…</p>
    </main>
  )

  if (projet?.statut === 'analyse_en_cours' || projet?.statut === 'nouveau') return <AnalyseEnCours projetId={id} />

  return (
    <main className="h-screen flex flex-col bg-bg">

      {/* Paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 text-gold text-xl mb-4">✦</div>
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mb-2">
                Ton chapitre gratuit a été utilisé
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                Pour continuer à rédiger ton livre, choisis une formule.
                Paiement sécurisé — accès immédiat après confirmation.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Par livre */}
              <div className="p-5 rounded-xl border-2 border-gold/40 bg-gold/5">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-stone-900">Par livre</div>
                  <div className="font-[family-name:var(--font-playfair)] font-bold text-gold text-xl">59€</div>
                </div>
                <p className="text-xs text-stone-500 mb-3">Paiement unique · Chapitres illimités · Export DOCX</p>
                <button
                  onClick={() => goCheckout('livre')}
                  disabled={checkoutLoading !== null}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gold text-white hover:bg-gold2 transition disabled:opacity-60"
                >
                  {checkoutLoading === 'livre' ? '⏳ Redirection…' : 'Payer 59€ →'}
                </button>
              </div>

              {/* Forfait */}
              <div className="p-5 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-cream">Forfait 5 livres</div>
                  <div className="font-[family-name:var(--font-playfair)] font-bold text-cream text-xl">159€</div>
                </div>
                <p className="text-xs text-muted mb-1">3 mois · 5 livres max · Support dédié</p>
                <p className="text-xs text-ok mb-3">Économise 136€ vs le tarif au livre</p>
                <button
                  onClick={() => goCheckout('forfait')}
                  disabled={checkoutLoading !== null}
                  className="w-full py-2.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:border-gold/30 hover:bg-stone-50 transition disabled:opacity-60"
                >
                  {checkoutLoading === 'forfait' ? '⏳ Redirection…' : 'Payer 159€ →'}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-muted2 mb-3">
              Carte, Google Pay, Apple Pay acceptés · Paiement Stripe sécurisé 🔒
            </p>
            <button
              onClick={() => setShowPaywall(false)}
              className="w-full text-xs text-muted2 hover:text-muted transition py-1"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0 bg-surface">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-[family-name:var(--font-playfair)] text-lg font-bold text-gold">Le Scribe</Link>
          <span className="text-muted2">/</span>
          <span className="text-sm text-muted truncate max-w-xs">{projet?.titre || 'Projet sans titre'}</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted2">Sauvegarde…</span>}
          <button onClick={() => saveCurrent()} className="text-xs text-muted hover:text-cream border border-border rounded-lg px-3 py-1.5 transition">Sauvegarder</button>
          <Link href={`/projets/${id}/couverture`} className="text-xs border border-border text-cream2 hover:border-gold/30 hover:text-gold rounded-lg px-3 py-1.5 transition">
            🎨 Couverture
          </Link>
          <Link href={`/projets/${id}/edition`} className="text-xs bg-gold text-bg hover:bg-gold2 rounded-lg px-3 py-1.5 transition font-medium">
            Mise en forme
          </Link>
          <Link href="/dashboard" className="text-xs text-muted hover:text-cream transition">← Accueil</Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar plan */}
        <aside className="w-64 bg-surface border-r border-border flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-medium text-muted uppercase tracking-widest">Plan du livre</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {/* Préface + Introduction */}
            {[
              { numero: -1, label: 'Préface', defaultTitre: 'Préface' },
              { numero: 0, label: 'Introduction', defaultTitre: plan?.introduction?.titre || 'Introduction' },
            ].map(({ numero, label, defaultTitre }) => {
              const ch = chapitres.find(c => c.numero === numero)
              const isActive = chapitreActif?.numero === numero
              const locked = ch && isLocked(ch)
              return (
                <button key={numero}
                  onClick={async () => {
                    if (locked) { setShowPaywall(true); return }
                    if (ch) { selectChapitre(ch); return }
                    const supabase = createClient()
                    const { data: newCh } = await supabase.from('chapitres').insert({ user_id: user.id, projet_id: id, numero, titre: defaultTitre, statut: 'vide' }).select().single()
                    if (newCh) { setChapitres(prev => [newCh, ...prev].sort((a, b) => a.numero - b.numero)); selectChapitre(newCh) }
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${isActive ? 'bg-gold/10 text-gold' : locked ? 'text-muted2 hover:bg-surface2' : ch ? 'text-cream hover:bg-surface2' : 'text-muted2 italic hover:bg-surface2'}`}>
                  <div className="font-medium flex items-center gap-1.5">
                    {locked && <span className="text-xs">🔒</span>}
                    {ch ? label : `+ ${label}`}
                  </div>
                  {ch && <div className="mt-0.5">{locked ? <span className="text-xs text-muted2 italic">Accès payant</span> : statutBadge(ch.statut)}</div>}
                </button>
              )
            })}

            {/* Chapitres réguliers */}
            {chapitres.map(ch => {
              const SPECIAL = [-1, 0, 998, 999]
              if (SPECIAL.includes(ch.numero)) return null
              const locked = isLocked(ch)
              return (
                <div key={ch.id} className="relative group">
                  <button onClick={() => locked ? setShowPaywall(true) : selectChapitre(ch)}
                    className={`w-full text-left px-4 py-2.5 pr-8 text-sm transition ${chapitreActif?.id === ch.id ? 'bg-gold/10 text-gold' : locked ? 'text-muted2 hover:bg-surface2' : 'text-cream hover:bg-surface2'}`}>
                    <div className="truncate font-medium flex items-center gap-1.5">
                      {locked && <span className="text-xs">🔒</span>}
                      Ch. {ch.numero} — {ch.titre}
                    </div>
                    <div className="mt-0.5">{locked ? <span className="text-xs text-muted2 italic">Accès payant</span> : statutBadge(ch.statut)}</div>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(ch.id) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-err hover:bg-err/10 transition opacity-0 group-hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  {confirmDeleteId === ch.id && (
                    <div className="absolute left-4 right-2 top-full z-20 bg-surface border border-border rounded-xl shadow-lg p-3 mt-1">
                      <p className="text-xs text-cream font-medium mb-2">Supprimer ce chapitre ?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 text-xs text-muted border border-border rounded-lg py-1.5 hover:bg-surface2 transition">Annuler</button>
                        <button onClick={() => deleteChapter(ch.id)} className="flex-1 text-xs bg-err/80 text-white rounded-lg py-1.5 hover:bg-err transition">Supprimer</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Bouton ajout */}
            <div className="px-3 pt-2 pb-1">
              <button onClick={() => setShowAddChapter(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gold/60 border border-dashed border-gold/20 rounded-lg hover:border-gold/40 hover:text-gold transition">
                <span>+</span> Ajouter un chapitre
              </button>
            </div>

            {/* Conclusion + Remerciements */}
            {[
              { numero: 999, label: 'Conclusion', defaultTitre: plan?.conclusion?.titre || 'Conclusion' },
              { numero: 998, label: 'Remerciements', defaultTitre: 'Remerciements' },
            ].map(({ numero, label, defaultTitre }) => {
              const ch = chapitres.find(c => c.numero === numero)
              const isActive = chapitreActif?.numero === numero
              const locked = ch && isLocked(ch)
              return (
                <button key={numero}
                  onClick={async () => {
                    if (locked) { setShowPaywall(true); return }
                    if (ch) { selectChapitre(ch); return }
                    const supabase = createClient()
                    const { data: newCh } = await supabase.from('chapitres').insert({ user_id: user.id, projet_id: id, numero, titre: defaultTitre, statut: 'vide' }).select().single()
                    if (newCh) { setChapitres(prev => [...prev, newCh].sort((a, b) => a.numero - b.numero)); selectChapitre(newCh) }
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${isActive ? 'bg-gold/10 text-gold' : locked ? 'text-muted2 hover:bg-surface2' : ch ? 'text-cream hover:bg-surface2' : 'text-muted2 italic hover:bg-surface2'}`}>
                  <div className="font-medium flex items-center gap-1.5">
                    {locked && <span className="text-xs">🔒</span>}
                    {ch ? label : `+ ${label}`}
                  </div>
                  {ch && <div className="mt-0.5">{locked ? <span className="text-xs text-muted2 italic">Accès payant</span> : statutBadge(ch.statut)}</div>}
                </button>
              )
            })}
          </div>

          {plan?.note_editoriale && <NoteEditoriale note={plan.note_editoriale} />}

          <div className="px-3 py-3 border-t border-border">
            <button onClick={indexerSources} disabled={indexing}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-cream hover:bg-surface2 rounded-lg transition disabled:opacity-50">
              {indexing ? '⏳ Indexation…' : indexingDone ? '✓ Sources indexées' : '↺ Indexer les sources'}
            </button>
          </div>
        </aside>

        {/* Zone centrale */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f7f4ef]">
          {showFinishBanner && (
            <div className="bg-gold/10 border-b border-gold/20 px-6 py-3 flex-shrink-0 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gold">Tous tes chapitres sont validés !</p>
                <p className="text-xs text-muted mt-0.5">Il est temps de rédiger l&apos;introduction et la conclusion.</p>
              </div>
              <button onClick={() => setShowFinishBanner(false)} className="text-muted2 hover:text-cream text-lg leading-none flex-shrink-0">×</button>
            </div>
          )}

          {chapitreActif ? (
            <>
              {/* En-tête chapitre */}
              <div className="bg-white border-b border-stone-200 px-6 py-3 flex-shrink-0">
                <div className="flex flex-col gap-2">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap pr-4">
                      <span className="text-xs text-stone-400 flex-shrink-0 uppercase tracking-widest">
                        {chapitreActif.numero === -1 ? 'Préface' : chapitreActif.numero === 0 ? 'Introduction' : chapitreActif.numero === 998 ? 'Remerciements' : chapitreActif.numero === 999 ? 'Conclusion' : `Chapitre ${chapitreActif.numero}`} —
                      </span>
                      <input
                        className="text-sm font-semibold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-gold/50 focus:outline-none min-w-0 w-full"
                        defaultValue={chapitreActif.titre}
                        key={chapitreActif.id + '-titre'}
                        onBlur={async e => {
                          const newTitre = e.target.value.trim()
                          if (!newTitre || newTitre === chapitreActif.titre) return
                          const supabase = createClient()
                          await supabase.from('chapitres').update({ titre: newTitre }).eq('id', chapitreActif.id)
                          setChapitres(prev => prev.map(c => c.id === chapitreActif.id ? { ...c, titre: newTitre } : c))
                          setChapitreActif(prev => ({ ...prev, titre: newTitre }))
                        }}
                      />
                    </div>
                    {(() => {
                      let chPlan = null
                      if (chapitreActif.numero === 0) chPlan = plan?.introduction ? { message_central: plan.introduction.resume } : null
                      else if (chapitreActif.numero === 999) chPlan = plan?.conclusion ? { message_central: plan.conclusion.resume } : null
                      else chPlan = plan?.chapitres?.find(c => c.numero === chapitreActif.numero)
                      return chPlan?.message_central ? (
                        <div className="mt-1">
                          <span className="text-xs text-stone-400">Objectif : </span>
                          <textarea
                            className="text-xs text-stone-500 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-gold/30 focus:outline-none w-full resize-none leading-relaxed overflow-hidden"
                            defaultValue={chPlan.message_central} key={chapitreActif.id + '-desc'} rows={1}
                            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                            onBlur={async e => {
                              const newDesc = e.target.value.trim()
                              if (!newDesc || newDesc === chPlan.message_central) return
                              const supabase = createClient(); let newPlan = { ...plan }
                              if (chapitreActif.numero === 0) newPlan = { ...plan, introduction: { ...(plan.introduction || {}), resume: newDesc } }
                              else if (chapitreActif.numero === 999) newPlan = { ...plan, conclusion: { ...(plan.conclusion || {}), resume: newDesc } }
                              else { const updatedChapitres = (plan.chapitres || []).map(c => c.numero === chapitreActif.numero ? { ...c, message_central: newDesc } : c); newPlan = { ...plan, chapitres: updatedChapitres } }
                              await supabase.from('projets_livres').update({ plan_ia: newPlan }).eq('id', id)
                              setProjet(prev => ({ ...prev, plan_ia: newPlan }))
                            }}
                          />
                        </div>
                      ) : null
                    })()}
                  </div>
                  {/* Actions chapitre */}
                  <div className="flex gap-2 flex-wrap relative">
                    {chapitreActif.statut === 'vide' && (
                      <button onClick={genererChapitre} disabled={generating}
                        className="text-xs bg-gold text-bg px-3 py-1.5 rounded-lg hover:bg-gold2 transition disabled:opacity-50 font-medium">
                        {generating ? '⏳ Génération…' : '✦ Générer ce chapitre'}
                      </button>
                    )}
                    {chapitreActif.statut !== 'vide' && chapitreActif.statut !== 'valide' && (
                      <>
                        <div className="relative group/ameliorer">
                          <button onClick={ameliorerChapitre} disabled={improving || generating}
                            className="text-xs bg-gold text-bg px-3 py-1.5 rounded-lg hover:bg-gold2 transition disabled:opacity-50 font-medium">
                            {improving ? '⏳ En cours…' : '✦ Améliorer le brouillon'}
                          </button>
                          <div className="absolute left-0 top-full mt-1.5 z-20 hidden group-hover/ameliorer:block w-56 bg-stone-900 border border-stone-700 text-stone-100 text-xs rounded-lg px-3 py-2 leading-relaxed pointer-events-none">
                            Garde ton texte et les retouches du chat. Complète ce qui manque.
                          </div>
                        </div>
                        <div className="relative">
                          <div className="relative group/regen">
                            <button onClick={() => setConfirmRegen(v => !v)} disabled={generating || improving}
                              className="text-xs border border-stone-200 text-stone-500 px-3 py-1.5 rounded-lg hover:border-gold/30 hover:text-stone-900 transition disabled:opacity-50">
                              ↺ Repartir de zéro
                            </button>
                            <div className="absolute left-0 top-full mt-1.5 z-20 hidden group-hover/regen:block w-56 bg-stone-900 border border-stone-700 text-stone-100 text-xs rounded-lg px-3 py-2 leading-relaxed pointer-events-none">
                              Ignore tout et génère un nouveau brouillon depuis le plan.
                            </div>
                          </div>
                          {confirmRegen && (
                            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-stone-200 rounded-xl shadow-lg p-3 w-64">
                              <p className="text-xs text-stone-900 font-medium mb-1">Repartir de zéro ?</p>
                              <p className="text-xs text-stone-500 mb-3">Le texte actuel et les modifications du chat seront effacés.</p>
                              <div className="flex gap-2">
                                <button onClick={() => setConfirmRegen(false)} className="flex-1 text-xs border border-stone-200 text-stone-500 rounded-lg py-1.5 hover:bg-stone-50 transition">Annuler</button>
                                <button onClick={() => { setConfirmRegen(false); genererChapitre() }} disabled={generating}
                                  className="flex-1 text-xs bg-warn/80 text-bg rounded-lg py-1.5 hover:bg-warn transition disabled:opacity-40 font-medium">Confirmer</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {(chapitreActif.statut === 'genere' || chapitreActif.statut === 'en_cours') && (
                      <button onClick={validerChapitre} className="text-xs bg-ok/80 text-bg px-3 py-1.5 rounded-lg hover:bg-ok transition font-medium">
                        ✓ Valider
                      </button>
                    )}
                    {chapitreActif.statut === 'valide' && (
                      <span className="text-xs bg-ok/10 text-ok border border-ok/20 px-3 py-1.5 rounded-lg font-medium">✓ Validé</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Zone de texte */}
              <textarea
                className="flex-1 p-8 text-[#1c1917] text-base leading-relaxed resize-none focus:outline-none bg-white"
                value={contenu}
                onChange={e => setContenu(e.target.value)}
                placeholder={chapitreActif.statut === 'vide' ? 'Clique sur "Générer ce chapitre" pour démarrer, ou écris directement ici…' : ''}
                style={{ fontFamily: 'Georgia, serif', fontSize: '17px', lineHeight: '1.8' }}
              />

              <div className="bg-white border-t border-stone-200 px-6 py-2 flex-shrink-0">
                <span className="text-xs text-stone-400">{contenu.trim().split(/\s+/).filter(Boolean).length} mots</span>
              </div>

              {/* Extras pédagogiques */}
              {chapitreActif.statut === 'valide' && (projet?.structure_interne?.includes('Points') || projet?.structure_interne?.includes('Questions')) && (
                <div className="bg-white border-t border-stone-200 flex-shrink-0 flex flex-col max-h-72">
                  {extrasIntegres ? (
                    <div className="px-6 py-4 flex items-center justify-between">
                      <span className="text-sm text-ok font-medium">✓ Éléments intégrés au chapitre</span>
                      <button onClick={() => setExtrasIntegres(false)} className="text-xs text-stone-500 hover:text-stone-900 transition">Revoir</button>
                    </div>
                  ) : !extras ? (
                    <div className="px-6 py-5">
                      <button onClick={genererExtras} disabled={generatingExtras}
                        className="flex items-center gap-2 text-sm bg-gold text-bg px-4 py-2 rounded-lg hover:bg-gold2 transition disabled:opacity-50 font-medium">
                        {generatingExtras ? '⏳ Génération…' : '✦ Générer les points clés et questions de réflexion'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200 flex-shrink-0">
                        <span className="text-xs font-medium text-stone-500 uppercase tracking-widest">Éléments pédagogiques</span>
                        <div className="flex items-center gap-3">
                          <button onClick={genererExtras} disabled={generatingExtras} className="text-xs text-stone-500 hover:text-gold transition">
                            {generatingExtras ? '…' : '↻ Regénérer'}
                          </button>
                          <button disabled={integrating}
                            onClick={async () => {
                              setIntegrating(true)
                              try {
                                const lignes = []
                                if (extras.points_cles?.length > 0) { lignes.push('\n\nPoints clés à retenir'); extras.points_cles.forEach((p, i) => lignes.push(`${i + 1}. ${p}`)) }
                                if (extras.questions?.length > 0) { lignes.push('\nQuestions de réflexion'); extras.questions.forEach(q => lignes.push(`— ${q}`)) }
                                const ajout = lignes.join('\n')
                                const base = contenu || chapitreActif.contenu_final || chapitreActif.contenu_ia || ''
                                const nouveau = base.trimEnd() + ajout
                                setContenu(nouveau)
                                const supabase = createClient()
                                const { error } = await supabase.from('chapitres').update({ contenu_final: nouveau, updated_at: new Date().toISOString() }).eq('id', chapitreActif.id)
                                if (error) throw new Error(error.message)
                                setExtrasIntegres(true)
                              } catch (e) { alert('Erreur : ' + e.message) }
                              setIntegrating(false)
                            }}
                            className="text-xs bg-ok/80 text-bg px-3 py-1 rounded-lg hover:bg-ok transition disabled:opacity-50 font-medium">
                            {integrating ? '…' : '✓ Intégrer'}
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto px-6 py-4 space-y-5">
                        {extras.points_cles?.length > 0 && (
                          <div>
                            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-2">Points clés à retenir</h3>
                            <ul className="space-y-2">
                              {extras.points_cles.map((p, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-gold font-bold flex-shrink-0 pt-1 text-sm">{i + 1}.</span>
                                  <textarea data-autoresize
                                    className="flex-1 text-sm text-stone-900 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-gold/30 leading-snug"
                                    rows={1} value={p}
                                    onChange={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; setExtras(prev => ({ ...prev, points_cles: prev.points_cles.map((v, j) => j === i ? e.target.value : v) })) }}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {extras.questions?.length > 0 && (
                          <div>
                            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-2">Questions de réflexion</h3>
                            <ul className="space-y-2">
                              {extras.questions.map((q, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-gold/50 flex-shrink-0 pt-1 text-sm">?</span>
                                  <textarea data-autoresize
                                    className="flex-1 text-sm text-stone-500 italic bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-gold/30 leading-snug"
                                    rows={1} value={q}
                                    onChange={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; setExtras(prev => ({ ...prev, questions: prev.questions.map((v, j) => j === i ? e.target.value : v) })) }}
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-stone-400">
                <div className="text-4xl mb-3 opacity-20">◻</div>
                <p className="text-sm">Sélectionne un chapitre dans le plan</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat assistant */}
        <aside className="w-80 bg-surface border-l border-border flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border flex-shrink-0">
            <p className="text-xs font-medium text-muted uppercase tracking-widest">Assistant</p>
            <p className="text-xs text-muted2 mt-0.5">Demande-moi de reformuler, développer, resserrer…</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-xs text-muted2 text-center mt-4">
                <p>Je connais ton style et ton plan.</p>
                <p className="mt-1">Dis-moi ce que tu veux améliorer.</p>
              </div>
            )}
            {chatMessages.map((m, i) => {
              if (m.role === 'user') return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] text-sm px-3 py-2 rounded-xl rounded-br-sm leading-relaxed bg-gold text-bg whitespace-pre-wrap">
                    {m.contenu}
                  </div>
                </div>
              )
              if (m.retryMsg) return (
                <div key={i} className="flex flex-col gap-1 items-start">
                  <div className="max-w-[85%] text-sm px-3 py-2 rounded-xl rounded-bl-sm leading-relaxed bg-warn/10 text-warn border border-warn/20">
                    {m.contenu}
                  </div>
                  <button onClick={() => { setChatMessages(prev => prev.filter((_, idx) => idx !== i)); sendChat(m.retryMsg) }}
                    className="text-xs text-warn hover:text-warn/80 px-2 py-1 rounded-lg border border-warn/20 hover:bg-warn/5 transition">
                    ↻ Réessayer
                  </button>
                </div>
              )
              const parts = []
              const regex = /<extrait>([\s\S]*?)<\/extrait>/g
              let last = 0, match
              while ((match = regex.exec(m.contenu)) !== null) {
                if (match.index > last) parts.push({ type: 'comment', text: m.contenu.slice(last, match.index).trim() })
                parts.push({ type: 'extrait', text: match[1].trim() })
                last = match.index + match[0].length
              }
              if (last < m.contenu.length) parts.push({ type: 'comment', text: m.contenu.slice(last).trim() })
              return (
                <div key={i} className="flex flex-col gap-2 items-start">
                  {parts.filter(p => p.text).map((p, j) => p.type === 'comment' ? (
                    <div key={j} className="max-w-[85%] text-sm px-3 py-2 rounded-xl rounded-bl-sm leading-relaxed bg-surface2 text-cream2 whitespace-pre-wrap">
                      {p.text}
                    </div>
                  ) : (
                    <div key={j} className="w-full border border-gold/20 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gold/5 border-b border-gold/20">
                        <span className="text-xs font-medium text-gold">Texte à insérer</span>
                        <button onClick={() => {
                          navigator.clipboard.writeText(p.text)
                          const el = document.getElementById(`copy-${i}-${j}`)
                          if (el) { el.textContent = 'Copié ✓'; setTimeout(() => { el.textContent = 'Copier' }, 2000) }
                        }} className="flex items-center gap-1 text-xs text-gold/60 hover:text-gold transition">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span id={`copy-${i}-${j}`}>Copier</span>
                        </button>
                      </div>
                      <div className="px-3 py-2 text-sm leading-relaxed text-cream2 whitespace-pre-wrap bg-surface2">
                        {p.text}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-surface2 text-muted text-sm px-3 py-2 rounded-xl rounded-bl-sm">…</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-border flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea ref={chatInputRef}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/40 resize-none overflow-hidden min-h-[40px] max-h-40 transition"
                rows={1} value={chatInput}
                onChange={e => { setChatInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                placeholder="Ton message… (Shift+Entrée = nouvelle ligne)"
              />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                className="bg-gold text-bg px-3 py-2 rounded-lg text-sm hover:bg-gold2 transition disabled:opacity-40 flex-shrink-0 font-medium">
                →
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal ajout chapitre */}
      {showAddChapter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setShowAddChapter(false); setAddTranscribing(null) } }}>
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-cream mb-5">Ajouter un chapitre</h2>

            {addTranscribing ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted mb-5">Chapitre créé. Lance la transcription de la vidéo YouTube pour alimenter ce chapitre.</p>
                <button onClick={transcribeNewSource} disabled={addLoading}
                  className="w-full bg-gold text-bg py-2.5 rounded-xl text-sm font-medium hover:bg-gold2 transition disabled:opacity-40">
                  {addLoading ? 'Transcription en cours…' : 'Transcrire la vidéo →'}
                </button>
                <button onClick={() => { setShowAddChapter(false); setAddTranscribing(null) }} className="mt-2 w-full text-sm text-muted hover:text-cream py-2 transition">Passer (transcrire plus tard)</button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted uppercase tracking-widest mb-2 block">Titre du chapitre</label>
                  <input className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/40 transition"
                    placeholder="Ex : Le pardon comme libération"
                    value={addForm.titre} onChange={e => setAddForm(f => ({ ...f, titre: e.target.value }))} />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted uppercase tracking-widest mb-2 block">Source</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[{ key: 'youtube', label: 'YouTube' }, { key: 'note', label: 'Note' }, { key: 'pdf', label: 'PDF' }, { key: 'docx', label: 'Word' }, { key: 'drive', label: 'Drive' }, { key: 'none', label: 'Aucune' }].map(opt => (
                      <button key={opt.key} onClick={() => setAddForm(f => ({ ...f, sourceType: opt.key }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${addForm.sourceType === opt.key ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-surface2 border-border text-muted hover:border-gold/20 hover:text-cream'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {addForm.sourceType === 'youtube' && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted uppercase tracking-widest mb-2 block">URL YouTube</label>
                    <input className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/40 transition"
                      placeholder="https://youtube.com/watch?v=…" value={addForm.sourceUrl} onChange={e => setAddForm(f => ({ ...f, sourceUrl: e.target.value }))} />
                  </div>
                )}
                {addForm.sourceType === 'note' && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted uppercase tracking-widest mb-2 block">Texte / Notes</label>
                    <textarea className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/40 resize-none transition"
                      rows={5} placeholder="Colle ici tes notes, idées, plan…" value={addForm.sourceText} onChange={e => setAddForm(f => ({ ...f, sourceText: e.target.value }))} />
                  </div>
                )}
                {(addForm.sourceType === 'pdf' || addForm.sourceType === 'docx') && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted uppercase tracking-widest mb-2 block">Fichier {addForm.sourceType.toUpperCase()}</label>
                    <input type="file" accept={addForm.sourceType === 'pdf' ? '.pdf' : '.docx,.doc'}
                      onChange={e => setAddFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gold/10 file:text-gold hover:file:bg-gold/20" />
                  </div>
                )}
                {addForm.sourceType === 'drive' && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-muted uppercase tracking-widest mb-2 block">Lien Google Docs / Drive</label>
                    <input className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/40 transition"
                      placeholder="https://docs.google.com/document/d/…" value={addForm.sourceUrl} onChange={e => setAddForm(f => ({ ...f, sourceUrl: e.target.value }))} />
                    <p className="text-xs text-muted2 mt-1">Le document doit être accessible à toute personne ayant le lien.</p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowAddChapter(false)} className="flex-1 py-2.5 rounded-xl text-sm border border-border text-muted hover:text-cream hover:border-gold/30 transition">Annuler</button>
                  <button onClick={addChapter} disabled={addLoading || !addForm.titre.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm bg-gold text-bg font-medium hover:bg-gold2 transition disabled:opacity-40">
                    {addLoading ? 'Ajout en cours…' : 'Ajouter le chapitre'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

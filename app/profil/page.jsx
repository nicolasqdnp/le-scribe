'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

function Chip({ field, val, selected, onToggle }) {
  return (
    <button type="button" onClick={() => onToggle(field, val)}
      className={`px-4 py-2 rounded-full text-sm border transition ${
        selected
          ? 'bg-gold/10 border-gold/50 text-gold font-medium'
          : 'border-border text-muted hover:border-gold/30 hover:text-cream'
      }`}>
      {val}
    </button>
  )
}

const COUNTRY_OPTIONS = [
  'France','Belgique','Suisse','Canada','Luxembourg',
  "Côte d'Ivoire",'Sénégal','Cameroun','République démocratique du Congo',
  'Congo-Brazzaville','Bénin','Togo','Burkina Faso','Mali','Niger',
  'Guinée','Madagascar','Haïti','Maroc','Algérie','Tunisie','Autre'
]

const EMPTY_YOUTUBE = [
  { url: '', fullService: false, start: '', end: '' },
  { url: '', fullService: false, start: '', end: '' },
  { url: '', fullService: false, start: '', end: '' }
]

function PortraitCard({ portrait, onEdit, onReanalyze, onFetchTranscripts, analyzing, fetchingTranscripts, transcriptsCount }) {
  return (
    <div className="space-y-5">
      <div className="bg-surface border border-border rounded-2xl p-8">
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="text-xs text-gold uppercase tracking-widest font-medium mb-2">Profil auteur analysé</div>
            <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream">Ton portrait stylistique</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={onReanalyze} disabled={analyzing || fetchingTranscripts}
              className="text-xs text-muted hover:text-cream border border-border rounded-lg px-3 py-1.5 transition disabled:opacity-50">
              {analyzing ? 'Analyse…' : '↻ Ré-analyser'}
            </button>
            <button onClick={onEdit}
              className="text-xs text-gold hover:text-gold2 border border-gold/30 rounded-lg px-3 py-1.5 transition">
              Modifier le formulaire
            </button>
          </div>
        </div>

        <div className="bg-surface2 border border-border rounded-xl p-5 mb-7">
          <p className="text-cream leading-relaxed italic text-sm">"{portrait.resume}"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Bloc title="Ton dominant" value={portrait.ton_dominant} />
          <Bloc title="Sa relation au lecteur" value={portrait.posture_auctoriale} />
          <Bloc title="Structure & argumentation" value={portrait.style_structure} />
          <Bloc title="Usage des Écritures" value={portrait.usage_scripture} />
          <Bloc title="Rythme des phrases" value={portrait.rythme_phrases} />
          <Bloc title="Appels à l'action" value={portrait.appels_action} />
        </div>

        {portrait.lexique_caracteristique?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">Lexique caractéristique</p>
            <div className="flex flex-wrap gap-2">
              {portrait.lexique_caracteristique.map((item, i) => (
                <span key={i} className="bg-surface2 text-cream2 px-3 py-1 rounded-full text-xs border border-border">{item}</span>
              ))}
            </div>
          </div>
        )}

        {portrait.forces_stylistiques?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">Forces stylistiques</p>
            <ul className="space-y-1.5">
              {portrait.forces_stylistiques.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-cream2">
                  <span className="text-gold mt-0.5 text-xs">✦</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {portrait.points_vigilance?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">Points de vigilance</p>
            <ul className="space-y-1.5">
              {portrait.points_vigilance.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-cream2">
                  <span className="text-warn mt-0.5 text-xs">⚠</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {portrait.confiance && (
          <div className="mt-7 pt-6 border-t border-border flex items-center gap-3">
            <div className="text-xs text-muted">Niveau de confiance :</div>
            <div className="flex-1 bg-surface3 rounded-full h-1.5">
              <div className="bg-gold h-full rounded-full" style={{ width: `${(portrait.confiance.score || 0) * 100}%` }} />
            </div>
            <div className="text-xs text-cream2">{Math.round((portrait.confiance.score || 0) * 100)}%</div>
            <div className="text-xs text-muted italic">{portrait.confiance.note}</div>
          </div>
        )}

        {transcriptsCount === 0 && (
          <div className="mt-5 p-4 bg-warn/10 border border-warn/20 rounded-xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-warn">Aucune transcription récupérée</p>
              <p className="text-xs text-muted mt-0.5">Le portrait repose uniquement sur le formulaire. Récupère les transcriptions YouTube pour l'affiner.</p>
            </div>
            <button
              onClick={onFetchTranscripts}
              disabled={fetchingTranscripts || analyzing}
              className="flex-shrink-0 text-xs bg-warn/20 hover:bg-warn/30 text-warn border border-warn/30 px-4 py-2 rounded-lg transition disabled:opacity-50 font-medium">
              {fetchingTranscripts ? '⏳ Récupération…' : '↓ Récupérer les transcriptions'}
            </button>
          </div>
        )}
      </div>

      {/* Appel à l'action */}
      <div className="mt-4 p-6 bg-surface border border-gold/20 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <p className="text-xs text-gold uppercase tracking-widest font-medium mb-1">Prochaine étape</p>
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-cream mb-1">Commence ton premier livre</h3>
        <p className="text-sm text-muted mb-5">Ton profil est prêt. L'IA va maintenant écrire dans ton style — chapitre par chapitre.</p>
        <a href="/nouveau-livre"
          className="inline-flex items-center gap-2 bg-gold text-ink font-semibold text-sm px-6 py-3 rounded-xl hover:bg-gold2 transition">
          Créer mon livre →
        </a>
      </div>
    </div>
  )
}

function Bloc({ title, value }) {
  if (!value) return null
  return (
    <div className="bg-surface2 rounded-xl p-4 border border-border">
      <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1.5">{title}</p>
      <p className="text-sm text-cream2 leading-relaxed">{value}</p>
    </div>
  )
}

export default function Profil() {
  const [mode, setMode] = useState('loading')
  const [cur, setCur] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState(null)
  const [portrait, setPortrait] = useState(null)
  const [transcriptsCount, setTranscriptsCount] = useState(0)
  const [fetchingTranscripts, setFetchingTranscripts] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const routerRef = useRef(router)
  useEffect(() => { routerRef.current = router }, [router])

  const [D, setD] = useState({
    nom: '', role: [], annees: 10, courant: [], pays: '', contexteCulturel: '',
    ton: [], illus: [], theo: 3, struct: [], rhet: [], formules: '',
    adapt: [], bible: [], langue: [], jamais: '',
    lecto: [], age: [], mission: '',
    youtube: EMPTY_YOUTUBE
  })

  function toggle(field, val) {
    setD(prev => ({
      ...prev,
      [field]: prev[field].includes(val) ? prev[field].filter(v => v !== val) : [...prev[field], val]
    }))
  }

  function updateYoutube(index, patch) {
    setD(prev => ({
      ...prev,
      youtube: prev.youtube.map((item, i) => i === index ? { ...item, ...patch } : item)
    }))
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setLoading(false); routerRef.current.replace('/login'); return }
      setUser(user)

      const [{ data: profile, error: profileError }, { data: analysis }] = await Promise.all([
        supabase.from('profils_auteurs').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('author_profile_analyses').select('portrait, transcripts_count').eq('user_id', user.id).maybeSingle()
      ])

      if (profileError) { setErrorMsg("Impossible de charger ton profil pour l'instant."); setLoading(false); setMode('form'); return }

      if (profile) {
        const { data: sourceRows } = await supabase
          .from('sources').select('url, ordre, metadata')
          .eq('profil_id', profile.id).eq('usage', 'author_style').eq('type', 'youtube')
          .order('ordre', { ascending: true })

        const youtube = [0, 1, 2].map(i => {
          const row = sourceRows?.[i]
          return { url: row?.url || '', fullService: Boolean(row?.metadata?.fullService), start: row?.metadata?.start || '', end: row?.metadata?.end || '' }
        })

        setD({
          nom: profile.nom || '', role: profile.role ? profile.role.split(', ').filter(Boolean) : [],
          annees: profile.annees_ministere || 10, courant: profile.courant ? profile.courant.split(', ').filter(Boolean) : [],
          pays: profile.pays || '', contexteCulturel: profile.contexte_culturel || '',
          ton: profile.ton ? profile.ton.split(', ').filter(Boolean) : [],
          illus: profile.illustrations ? profile.illustrations.split(', ').filter(Boolean) : [],
          theo: profile.niveau_theologique || 3, struct: profile.structure ? profile.structure.split(', ').filter(Boolean) : [],
          rhet: profile.questions_rhetoriques ? profile.questions_rhetoriques.split(', ').filter(Boolean) : [],
          formules: profile.formules || '', adapt: profile.adaptation ? profile.adaptation.split(', ').filter(Boolean) : [],
          bible: profile.bible ? profile.bible.split(', ').filter(Boolean) : [],
          langue: profile.langue ? profile.langue.split(', ').filter(Boolean) : [],
          jamais: profile.a_eviter || '', lecto: profile.lectorat ? profile.lectorat.split(', ').filter(Boolean) : [],
          age: profile.tranches_age ? profile.tranches_age.split(', ').filter(Boolean) : [],
          mission: profile.mission || '', youtube
        })
      }

      if (analysis?.portrait) {
        setPortrait(analysis.portrait)
        setTranscriptsCount(analysis.transcripts_count ?? 0)
        setMode('portrait')
      } else { setMode('form') }
      setLoading(false)
    }

    init()
    const handlePageShow = e => { if (e.persisted) init() }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  async function saveProfile() {
    const supabase = createClient()
    const payload = {
      user_id: user.id, nom: D.nom.trim(), role: D.role.join(', '),
      annees_ministere: parseInt(D.annees, 10), courant: D.courant.join(', '),
      pays: D.pays, contexte_culturel: D.contexteCulturel.trim(),
      ton: D.ton.join(', '), illustrations: D.illus.join(', '),
      niveau_theologique: parseInt(D.theo, 10), structure: D.struct.join(', '),
      questions_rhetoriques: D.rhet.join(', '), formules: D.formules.trim(),
      adaptation: D.adapt.join(', '), bible: D.bible.join(', '),
      langue: D.langue.join(', '), a_eviter: D.jamais.trim(),
      lectorat: D.lecto.join(', '), tranches_age: D.age.join(', '), mission: D.mission.trim()
    }

    const { data: existing } = await supabase.from('profils_auteurs').select('id').eq('user_id', user.id).maybeSingle()
    let profileId = existing?.id || null

    if (profileId) { await supabase.from('profils_auteurs').update(payload).eq('user_id', user.id) }
    else { const { data: inserted } = await supabase.from('profils_auteurs').insert(payload).select().single(); profileId = inserted.id }

    const youtubeRows = D.youtube.map((item, index) => ({
      user_id: user.id, profil_id: profileId, projet_id: null, type: 'youtube', usage: 'author_style',
      label: `Prédication YouTube ${index + 1}`, url: item.url.trim(), ordre: index,
      metadata: { fullService: item.fullService, start: item.start?.trim() || '', end: item.end?.trim() || '' }
    })).filter(item => item.url)

    await supabase.from('sources').delete().eq('profil_id', profileId).eq('usage', 'author_style')
    if (youtubeRows.length > 0) await supabase.from('sources').insert(youtubeRows)
  }

  async function handleSaveAndAnalyze() {
    setLoading(true); setErrorMsg('')
    try {
      await saveProfile(); setLoading(false); setMode('analyzing')
      const res = await fetch('/api/analyze-profile', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
      setPortrait(json.portrait); setMode('portrait')
    } catch (e) { setErrorMsg(e?.message || 'Une erreur est survenue.'); setLoading(false); setMode('form') }
  }

  async function handleSaveEdits() {
    setLoading(true); setErrorMsg('')
    try { await saveProfile(); setSaved(true); setLoading(false); setTimeout(() => setMode('portrait'), 1000) }
    catch (e) { setErrorMsg(e?.message || 'Une erreur est survenue.'); setLoading(false) }
  }

  async function handleReanalyze() {
    setErrorMsg(''); setMode('analyzing')
    try {
      const res = await fetch('/api/analyze-profile', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur inconnue')
      setPortrait(json.portrait); setMode('portrait')
    } catch (e) { setErrorMsg(e?.message || 'Une erreur est survenue.'); setMode('portrait') }
  }

  async function handleFetchTranscripts() {
    setFetchingTranscripts(true); setErrorMsg('')
    try {
      const res = await fetch('/api/fetch-profile-transcripts', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur')
      if (json.fetched === 0) {
        setErrorMsg('Impossible de récupérer les transcriptions (vidéos sans sous-titres accessibles).')
        setFetchingTranscripts(false); return
      }
      // Re-analyser avec les nouvelles transcriptions
      setFetchingTranscripts(false); setMode('analyzing')
      const res2 = await fetch('/api/analyze-profile', { method: 'POST' })
      const json2 = await res2.json()
      if (!res2.ok) throw new Error(json2.error || 'Erreur analyse')
      setPortrait(json2.portrait); setTranscriptsCount(json.fetched); setMode('portrait')
    } catch (e) {
      setErrorMsg(e?.message || 'Une erreur est survenue.')
      setFetchingTranscripts(false); setMode('portrait')
    }
  }

  const isEditMode = mode === 'form' && portrait !== null

  // Styles partagés pour les champs de formulaire
  const inputCls = "w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
  const textareaCls = `${inputCls} min-h-20`

  const sections = [
    {
      tag: '1 / 5', title: 'Ton identité',
      desc: 'Ces informations définissent qui tu es — indépendamment de tout livre.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Prénom et nom</label>
            <input className={inputCls} value={D.nom} onChange={e => setD({...D, nom: e.target.value})} placeholder="Jean Dupont" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Ton rôle <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Pasteur','Évangéliste','Enseignant biblique','Prophète','Apôtre','Autre'].map(v => <Chip key={v} field="role" val={v} selected={D.role.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Années de ministère : <span className="text-gold">{D.annees} ans</span></label>
            <input type="range" min="1" max="45" value={D.annees} onChange={e => setD({...D, annees: e.target.value})} className="w-full accent-[#c9a77d]" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Courant théologique <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Évangélique','Pentecôtiste','Charismatique','Baptiste','Réformé','Interconfessionnel','Autre'].map(v => <Chip key={v} field="courant" val={v} selected={D.courant.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Pays</label>
            <select className={inputCls} value={D.pays} onChange={e => setD({...D, pays: e.target.value})}
              style={{ backgroundColor: '#1e1e1e' }}>
              <option value="">Sélectionner un pays</option>
              {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Contexte culturel <span className="normal-case text-muted2 tracking-normal font-normal">(optionnel)</span></label>
            <input className={inputCls} value={D.contexteCulturel} onChange={e => setD({...D, contexteCulturel: e.target.value})} placeholder="Ex : Afrique francophone, diaspora, France urbaine…" /></div>
        </div>
      )
    },
    {
      tag: '2 / 5', title: 'Ton style de prédication',
      desc: 'Ta voix écrite naît de ta voix orale.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Ton dominant <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Pastoral et bienveillant','Prophétique et direct','Enseignant et structuré','Narratif et storytelling','Apologétique et argumenté','Exhortatif et mobilisateur'].map(v => <Chip key={v} field="ton" val={v} selected={D.ton.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Illustrations <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Anecdotes personnelles','Exemples bibliques avant tout','Analogies du quotidien','Faits historiques',"Peu d'illustrations"].map(v => <Chip key={v} field="illus" val={v} selected={D.illus.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Niveau théologique : <span className="text-gold">{['','Très accessible','Accessible','Intermédiaire','Avancé','Académique'][D.theo]}</span></label>
            <input type="range" min="1" max="5" value={D.theo} onChange={e => setD({...D, theo: e.target.value})} className="w-full accent-[#c9a77d]" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Structure habituelle</label>
            <div className="flex flex-wrap gap-2 mt-1">{['Texte → explication → application','Thèse + 3 points','Narration → révélation','Question → réponse → appel','Libre / variable'].map(v => <Chip key={v} field="struct" val={v} selected={D.struct.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Questions rhétoriques</label>
            <div className="flex flex-wrap gap-2 mt-1">{['Oui, souvent','Parfois','Rarement'].map(v => <Chip key={v} field="rhet" val={v} selected={D.rhet.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Formules récurrentes</label>
            <textarea className={textareaCls} value={D.formules} onChange={e => setD({...D, formules: e.target.value})} placeholder='"La Bible dit clairement…", "Retenez ceci…"' /></div>
        </div>
      )
    },
    {
      tag: '3 / 5', title: 'Ta voix écrite',
      desc: 'Comment veux-tu sonner dans tes livres ?',
      content: (
        <div className="space-y-5">
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Adaptation oral → écrit <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{["Fidèle à l'oral",'Plus structuré et épuré','Plus intime et personnel','Plus académique','Plus accessible'].map(v => <Chip key={v} field="adapt" val={v} selected={D.adapt.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Version biblique <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Louis Segond 1910','Segond 21','Bible du Semeur','Martin 1744','Ostervald','Variable selon passage'].map(v => <Chip key={v} field="bible" val={v} selected={D.bible.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Langue d'écriture <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Français','Anglais','Espagnol','Autre'].map(v => <Chip key={v} field="langue" val={v} selected={D.langue.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">À ne jamais écrire</label>
            <textarea className={textareaCls} value={D.jamais} onChange={e => setD({...D, jamais: e.target.value})} placeholder="Langage trop académique, références politiques…" /></div>
        </div>
      )
    },
    {
      tag: '4 / 5', title: 'Ton lectorat habituel',
      desc: 'Les personnes que tu touches en général dans ton ministère.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Profil <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Nouveaux croyants','Chrétiens en croissance','Leaders et pasteurs','Chercheurs spirituels','Grand public'].map(v => <Chip key={v} field="lecto" val={v} selected={D.lecto.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Tranches d'âge <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Adolescents','Jeunes adultes (18–30)','Adultes (30–50)','Séniors (50+)','Tous âges'].map(v => <Chip key={v} field="age" val={v} selected={D.age.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Ta mission profonde comme auteur</label>
            <textarea className={textareaCls} value={D.mission} onChange={e => setD({...D, mission: e.target.value})} placeholder="Ancrer la foi dans une connaissance biblique solide…" /></div>
        </div>
      )
    },
    {
      tag: '5 / 5', title: 'Tes prédications YouTube',
      desc: "2 à 3 liens représentatifs de ton style. L'IA les analysera pour affiner ton portrait.",
      content: (
        <div className="space-y-5">
          {D.youtube.map((item, index) => (
            <div key={index} className="rounded-xl border border-border bg-surface2 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Lien {index + 1}</label>
                <input className={inputCls} value={item.url} onChange={e => updateYoutube(index, { url: e.target.value })} placeholder="https://youtu.be/…" />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={item.fullService}
                  onChange={e => updateYoutube(index, { fullService: e.target.checked, start: e.target.checked ? item.start : '', end: e.target.checked ? item.end : '' })}
                  className="mt-1 h-4 w-4 accent-[#c9a77d]" />
                <div>
                  <div className="text-sm font-medium text-cream">Culte entier (louange, annonces, etc.)</div>
                  <div className="text-xs text-muted mt-0.5">Coche si la vidéo contient tout le culte — précise alors quand commence et finit la prédication.</div>
                </div>
              </label>
              {item.fullService && (
                <div className="rounded-lg bg-surface border border-border p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Début</label>
                    <input className={inputCls} value={item.start} onChange={e => updateYoutube(index, { start: e.target.value })} placeholder="32:15" />
                    <p className="text-xs text-muted2 mt-1">Format : mm:ss ou hh:mm:ss</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Fin</label>
                    <input className={inputCls} value={item.end} onChange={e => updateYoutube(index, { end: e.target.value })} placeholder="1:18:40" />
                    <p className="text-xs text-muted2 mt-1">Format : mm:ss ou hh:mm:ss</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }
  ]

  const pct = Math.round(((cur + 1) / 5) * 100)

  if (mode === 'loading') return (
    <main className="min-h-screen page-glow flex items-center justify-center">
      <p className="text-muted text-sm">Chargement…</p>
    </main>
  )

  if (mode === 'analyzing') return (
    <main className="min-h-screen page-glow flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="font-[family-name:var(--font-playfair)] text-5xl text-gold mb-6 animate-pulse">✦</div>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-cream mb-3">L'IA analyse ton profil…</h2>
        <p className="text-muted text-sm leading-relaxed">Transcription des vidéos YouTube et analyse stylistique en cours. Cela peut prendre 30 à 60 secondes.</p>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen page-glow">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <a href="/dashboard" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-gold">Le Scribe</a>
        <span className="text-xs text-muted">Profil auteur</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {errorMsg && (
          <div className="mb-6 bg-err/10 border border-err/20 text-err text-sm rounded-xl px-4 py-3">{errorMsg}</div>
        )}

        {mode === 'portrait' && portrait ? (
          <PortraitCard portrait={portrait} onEdit={() => { setCur(0); setMode('form') }} onReanalyze={handleReanalyze} onFetchTranscripts={handleFetchTranscripts} analyzing={false} fetchingTranscripts={fetchingTranscripts} transcriptsCount={transcriptsCount} />
        ) : (
          <>
            {isEditMode && (
              <div className="mb-6 bg-gold/5 border border-gold/20 rounded-xl px-4 py-3 text-sm text-gold">
                Tu modifies ton profil. Sauvegarde pour revenir à ton portrait, ou ré-analyse pour le mettre à jour.
              </div>
            )}

            {/* Barre de progression */}
            <div className="mb-8">
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>Étape {cur + 1} sur 5</span><span>{pct}%</span>
              </div>
              <div className="h-px bg-border rounded-full">
                <div className="h-px bg-gold rounded-full transition-all" style={{ width: pct + '%' }} />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-8">
              <div className="text-xs font-medium text-gold uppercase tracking-widest mb-2">{sections[cur].tag}</div>
              <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream mb-1">{sections[cur].title}</h1>
              <p className="text-muted text-sm mb-8">{sections[cur].desc}</p>
              {sections[cur].content}
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="flex gap-3 items-center">
                {cur > 0 && <button onClick={() => setCur(cur - 1)} className="text-sm text-muted hover:text-cream transition">← Retour</button>}
                {isEditMode && <button onClick={() => setMode('portrait')} className="text-sm text-muted2 hover:text-muted transition">Annuler</button>}
              </div>

              {cur < 4 ? (
                <button onClick={() => setCur(cur + 1)} className="bg-gold text-bg px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold2 transition">
                  Continuer →
                </button>
              ) : (
                <div className="flex gap-3">
                  {isEditMode && (
                    <button onClick={handleSaveEdits} disabled={loading} className="border border-gold/30 text-gold px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gold/5 transition disabled:opacity-50">
                      {saved ? '✓ Sauvegardé' : loading ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                  )}
                  <button onClick={handleSaveAndAnalyze} disabled={loading} className="bg-gold text-bg px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold2 transition disabled:opacity-50">
                    {loading ? 'Sauvegarde…' : isEditMode ? '↻ Sauvegarder et ré-analyser →' : 'Analyser mon profil →'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

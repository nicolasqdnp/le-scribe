'use client'
import { useState, useEffect } from 'react'
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

export default function NouveauLivre() {
  const [cur, setCur] = useState(0)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const [D, setD] = useState({
    titre: '', sujet: '', objectif: [], lecto: [], transfo: '',
    chapitres: 7, longueur: [], struct: [], plan: '',
    ytLinks: [{ url: '', culteEntier: false, debut: '', fin: '' }],
    gdocLinks: [''], uploadedFiles: [], notes: '',
    ton: [], inclure: '', eviter: '', phrase: ''
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login')
      else setUser(user)
    })
  }, [])

  function toggle(field, val) {
    setD(prev => ({ ...prev, [field]: prev[field].includes(val) ? prev[field].filter(v => v !== val) : [...prev[field], val] }))
  }

  function addYtLink() { setD(prev => ({ ...prev, ytLinks: [...prev.ytLinks, { url: '', culteEntier: false, debut: '', fin: '' }] })) }
  function removeYtLink(i) { setD(prev => ({ ...prev, ytLinks: prev.ytLinks.filter((_, idx) => idx !== i) })) }
  function updateYtLink(i, field, val) {
    setD(prev => { const links = [...prev.ytLinks]; links[i] = { ...links[i], [field]: val }; return { ...prev, ytLinks: links } })
  }
  function toggleCulteEntier(i) {
    setD(prev => {
      const links = [...prev.ytLinks]
      const on = !links[i].culteEntier
      links[i] = { ...links[i], culteEntier: on, debut: on ? links[i].debut : '', fin: on ? links[i].fin : '' }
      return { ...prev, ytLinks: links }
    })
  }
  function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    setD(prev => ({ ...prev, uploadedFiles: [...prev.uploadedFiles, ...files] }))
  }
  function removeFile(i) { setD(prev => ({ ...prev, uploadedFiles: prev.uploadedFiles.filter((_, idx) => idx !== i) })) }
  function addGdocLink() { setD(prev => ({ ...prev, gdocLinks: [...prev.gdocLinks, ''] })) }
  function removeGdocLink(i) { setD(prev => ({ ...prev, gdocLinks: prev.gdocLinks.filter((_, idx) => idx !== i) })) }
  function updateGdocLink(i, val) {
    setD(prev => { const links = [...prev.gdocLinks]; links[i] = val; return { ...prev, gdocLinks: links } })
  }

  async function save() {
    if (!user) return
    setLoading(true); setError('')
    const supabase = createClient()

    const { data: projet, error: projetError } = await supabase.from('projets_livres').insert({
      user_id: user.id, titre: D.titre, sujet: D.sujet,
      objectif: D.objectif.join(', '), lectorat: D.lecto.join(', '),
      transformation: D.transfo, nb_chapitres: parseInt(D.chapitres),
      longueur: D.longueur.join(', '), structure_interne: D.struct.join(', '),
      plan_existant: D.plan, ton: D.ton.join(', '),
      a_inclure: D.inclure, a_eviter: D.eviter, message_cle: D.phrase,
      statut: 'nouveau'
    }).select().single()

    if (projetError || !projet) { setError('Erreur création projet : ' + (projetError?.message || 'inconnue')); setLoading(false); return }

    const sourcesPayload = []
    D.ytLinks.filter(item => item.url.trim()).forEach((item, index) => {
      sourcesPayload.push({ user_id: user.id, projet_id: projet.id, type: 'youtube', usage: 'book_source',
        label: `Vidéo YouTube ${index + 1}`, url: item.url.trim(), ordre: index,
        metadata: { culteEntier: item.culteEntier, debut: item.debut, fin: item.fin } })
    })
    D.gdocLinks.filter(l => l.trim()).forEach((link, index) => {
      sourcesPayload.push({ user_id: user.id, projet_id: projet.id, type: 'drive', usage: 'book_source',
        label: `Google Doc ${index + 1}`, url: link.trim(), ordre: 100 + index, metadata: {} })
    })
    if (D.notes.trim()) {
      sourcesPayload.push({ user_id: user.id, projet_id: projet.id, type: 'note', usage: 'book_source',
        label: 'Notes texte libre', contenu_brut: D.notes.trim(), ordre: 200, metadata: {} })
    }
    if (sourcesPayload.length > 0) await supabase.from('sources').insert(sourcesPayload)

    setLoading(false)
    router.push(`/projets/${projet.id}`)
  }

  const inputCls = "w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
  const textareaCls = `${inputCls} min-h-20`

  const sections = [
    {
      tag: '1 / 4', title: 'Le livre', desc: 'Définis le projet précis — spécifique à ce livre.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Titre provisoire</label>
            <input className={inputCls} value={D.titre} onChange={e => setD({...D, titre: e.target.value})} placeholder="Ex : Peut-on prouver l'existence de Dieu ?" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Sujet central</label>
            <textarea className={textareaCls} value={D.sujet} onChange={e => setD({...D, sujet: e.target.value})} placeholder="En 2-3 phrases : quel est le cœur du message ?" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Objectif principal <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{["Affermir la foi","Équiper pour l'évangélisation",'Répondre aux questions difficiles','Formation de disciples','Toucher les non-croyants'].map(v => <Chip key={v} field="objectif" val={v} selected={D.objectif.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Lectorat cible <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Nouveaux croyants','Chrétiens en croissance',"Leaders d'église",'Chercheurs spirituels','Grand public','Tous profils'].map(v => <Chip key={v} field="lecto" val={v} selected={D.lecto.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Transformation visée</label>
            <textarea className={textareaCls} value={D.transfo} onChange={e => setD({...D, transfo: e.target.value})} placeholder="Qu'est-ce que le lecteur doit emporter après ce livre ?" /></div>
        </div>
      )
    },
    {
      tag: '2 / 4', title: 'Structure et format', desc: 'Quelques paramètres pour cadrer la génération du plan.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Nombre de chapitres : <span className="text-gold">{D.chapitres}</span></label>
            <input type="range" min="3" max="20" value={D.chapitres} onChange={e => setD({...D, chapitres: e.target.value})} className="w-full accent-[#c9a77d]" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Longueur cible</label>
            <div className="flex flex-wrap gap-2 mt-1">{['Livret (30–50 pages)','Court (80–120 pages)','Moyen (120–200 pages)','Long (200+ pages)'].map(v => <Chip key={v} field="longueur" val={v} selected={D.longueur.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Structure interne <span className="normal-case text-muted2 tracking-normal font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Intro + développement + conclusion','Questions de réflexion','Versets encadrés','Points clés à retenir','Prière de conclusion','Titres de paragraphes'].map(v => <Chip key={v} field="struct" val={v} selected={D.struct.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Plan existant <span className="normal-case text-muted2 tracking-normal font-normal">(optionnel)</span></label>
            <textarea className={`${inputCls} min-h-24`} value={D.plan} onChange={e => setD({...D, plan: e.target.value})} placeholder="Colle un plan existant ou décris une structure…" /></div>
        </div>
      )
    },
    {
      tag: '3 / 4', title: 'Tes sources', desc: 'Les matières premières du livre.',
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-3">Liens YouTube <span className="normal-case text-muted2 tracking-normal font-normal">(autant que nécessaire)</span></label>
            {D.ytLinks.map((link, i) => (
              <div key={i} className="mb-4 rounded-xl border border-border bg-surface2 p-4">
                <div className="flex gap-2 mb-3">
                  <input className={inputCls} value={link.url} onChange={e => updateYtLink(i, 'url', e.target.value)} placeholder={`Lien ${i + 1} — https://youtu.be/…`} />
                  {D.ytLinks.length > 1 && <button type="button" onClick={() => removeYtLink(i)} className="text-muted2 hover:text-err px-2 text-lg transition">×</button>}
                </div>
                <label className="flex items-start gap-2 text-sm cursor-pointer mb-3">
                  <input type="checkbox" checked={link.culteEntier} onChange={() => toggleCulteEntier(i)} className="mt-0.5 accent-[#c9a77d]" />
                  <div>
                    <div className="font-medium text-cream">Culte entier (louange, annonces, etc.)</div>
                    <div className="text-xs text-muted mt-0.5">Coche si la vidéo contient tout le culte — précise alors quand commence et finit la prédication.</div>
                  </div>
                </label>
                {link.culteEntier && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface border border-border rounded-lg p-3">
                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Début</label>
                      <input className={inputCls} value={link.debut} onChange={e => updateYtLink(i, 'debut', e.target.value)} placeholder="32:15" />
                      <p className="text-xs text-muted2 mt-1">Format : mm:ss ou hh:mm:ss</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Fin</label>
                      <input className={inputCls} value={link.fin} onChange={e => updateYtLink(i, 'fin', e.target.value)} placeholder="1:18:40" />
                      <p className="text-xs text-muted2 mt-1">Format : mm:ss ou hh:mm:ss</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addYtLink} className="text-sm text-gold hover:text-gold2 transition">+ Ajouter un lien YouTube</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-3">Liens Google Docs <span className="normal-case text-muted2 tracking-normal font-normal">(optionnel)</span></label>
            {D.gdocLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className={inputCls} value={link} onChange={e => updateGdocLink(i, e.target.value)} placeholder={`Lien ${i + 1} — https://docs.google.com/…`} />
                {D.gdocLinks.length > 1 && <button type="button" onClick={() => removeGdocLink(i)} className="text-muted2 hover:text-err text-lg transition">×</button>}
              </div>
            ))}
            <button type="button" onClick={addGdocLink} className="text-sm text-gold hover:text-gold2 transition">+ Ajouter un lien Google Doc</button>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Fichiers PDF ou Word</label>
            <p className="text-xs text-muted2 mb-3">Notes de prédication, plans, outlines — formats acceptés : PDF, DOC, DOCX</p>
            <label className="flex items-center gap-3 border-2 border-dashed border-border rounded-xl px-4 py-6 cursor-pointer hover:border-gold/30 transition">
              <div className="text-muted text-2xl">↑</div>
              <div>
                <div className="text-sm font-medium text-cream">Clique pour choisir des fichiers</div>
                <div className="text-xs text-muted">PDF, DOC, DOCX — max 10MB par fichier</div>
              </div>
              <input type="file" multiple accept=".pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
            </label>
            {D.uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {D.uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2 border border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted">◻</span>
                      <span className="text-sm text-cream">{f.name}</span>
                      <span className="text-xs text-muted2">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-muted2 hover:text-err transition">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Notes texte libre</label>
            <textarea className={`${inputCls} min-h-32`} value={D.notes} onChange={e => setD({...D, notes: e.target.value})} placeholder="Colle directement tes notes, idées, citations ici…" />
          </div>
        </div>
      )
    },
    {
      tag: '4 / 4', title: 'Consignes spécifiques', desc: 'Instructions particulières pour ce livre.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Ton pour ce livre</label>
            <div className="flex flex-wrap gap-2 mt-1">{['Identique à mes prédications','Plus accessible','Plus rigoureux et argumenté','Plus intime et personnel'].map(v => <Chip key={v} field="ton" val={v} selected={D.ton.includes(v)} onToggle={toggle} />)}</div></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">À inclure absolument</label>
            <textarea className={textareaCls} value={D.inclure} onChange={e => setD({...D, inclure: e.target.value})} placeholder="Arguments, versets, thèmes incontournables…" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">À éviter dans ce livre</label>
            <textarea className={textareaCls} value={D.eviter} onChange={e => setD({...D, eviter: e.target.value})} placeholder="Sujets, références, tournures à éviter…" /></div>
          <div><label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Message clé que le lecteur doit retenir</label>
            <textarea className={textareaCls} value={D.phrase} onChange={e => setD({...D, phrase: e.target.value})} placeholder="La phrase ou idée centrale du livre…" /></div>
        </div>
      )
    }
  ]

  const pct = Math.round(((cur + 1) / 4) * 100)

  return (
    <main className="min-h-screen page-glow">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <a href="/dashboard" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-gold">Le Scribe</a>
        <span className="text-xs text-muted">Nouveau livre</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {error && <div className="mb-6 bg-err/10 border border-err/20 text-err text-sm rounded-xl px-4 py-3">{error}</div>}

        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted mb-2"><span>Étape {cur + 1} sur 4</span><span>{pct}%</span></div>
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
          {cur > 0 ? <button onClick={() => setCur(cur - 1)} className="text-sm text-muted hover:text-cream transition">← Retour</button> : <div />}
          {cur < 3
            ? <button onClick={() => setCur(cur + 1)} className="bg-gold text-bg px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold2 transition">Continuer →</button>
            : <button onClick={save} disabled={loading} className="bg-gold text-bg px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gold2 transition disabled:opacity-50">
                {loading ? 'Sauvegarde…' : 'Analyser mes sources et générer un plan →'}
              </button>
          }
        </div>
      </div>
    </main>
  )
}

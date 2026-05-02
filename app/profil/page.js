'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Profil() {
  const [cur, setCur] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()

  const [D, setD] = useState({
    nom: '', role: [], annees: 10, courant: [], pays: '',
    ton: [], illus: [], theo: 3, struct: [], rhet: [],
    formules: '', adapt: [], bible: [], langue: [], jamais: '',
    lecto: [], age: [], mission: '',
    yt1: '', yt2: '', yt3: '', extra: ''
  })

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profils_auteurs').select('*').eq('user_id', user.id).single()
      if (data) {
        setD({
          nom: data.nom || '',
          role: data.role ? data.role.split(', ') : [],
          annees: data.annees_ministere || 10,
          courant: data.courant ? data.courant.split(', ') : [],
          pays: data.pays || '',
          ton: data.ton ? data.ton.split(', ') : [],
          illus: data.illustrations ? data.illustrations.split(', ') : [],
          theo: data.niveau_theologique || 3,
          struct: data.structure ? data.structure.split(', ') : [],
          rhet: data.questions_rhetoriques ? data.questions_rhetoriques.split(', ') : [],
          formules: data.formules || '',
          adapt: data.adaptation ? data.adaptation.split(', ') : [],
          bible: data.bible ? data.bible.split(', ') : [],
          langue: data.langue ? data.langue.split(', ') : [],
          jamais: data.a_eviter || '',
          lecto: data.lectorat ? data.lectorat.split(', ') : [],
          age: data.tranches_age ? data.tranches_age.split(', ') : [],
          mission: data.mission || '',
          yt1: data.youtube_1 || '',
          yt2: data.youtube_2 || '',
          yt3: data.youtube_3 || '',
          extra: data.complement || ''
        })
      }
    }
    getUser()
  }, [])

  function toggle(field, val) {
    setD(prev => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter(v => v !== val)
        : [...prev[field], val]
    }))
  }

  function Chip({ field, val }) {
    const on = D[field].includes(val)
    return (
      <button type="button" onClick={() => toggle(field, val)}
        className={`px-4 py-2 rounded-full text-sm border transition ${on ? 'bg-violet-100 border-violet-500 text-violet-800 font-medium' : 'border-stone-300 text-stone-500 hover:border-violet-400'}`}>
        {val}
      </button>
    )
  }

  async function save() {
    setLoading(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      nom: D.nom,
      role: D.role.join(', '),
      annees_ministere: parseInt(D.annees),
      courant: D.courant.join(', '),
      pays: D.pays,
      ton: D.ton.join(', '),
      illustrations: D.illus.join(', '),
      niveau_theologique: parseInt(D.theo),
      structure: D.struct.join(', '),
      questions_rhetoriques: D.rhet.join(', '),
      formules: D.formules,
      adaptation: D.adapt.join(', '),
      bible: D.bible.join(', '),
      langue: D.langue.join(', '),
      a_eviter: D.jamais,
      lectorat: D.lecto.join(', '),
      tranches_age: D.age.join(', '),
      mission: D.mission,
      youtube_1: D.yt1,
      youtube_2: D.yt2,
      youtube_3: D.yt3,
      complement: D.extra
    }
    const { data: existing } = await supabase.from('profils_auteurs').select('id').eq('user_id', user.id).single()
    if (existing) {
      await supabase.from('profils_auteurs').update(payload).eq('user_id', user.id)
    } else {
      await supabase.from('profils_auteurs').insert(payload)
    }
    setLoading(false)
    setSaved(true)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  const sections = [
    {
      tag: '1 / 5', title: 'Ton identité',
      desc: 'Ces informations définissent qui tu es — indépendamment de tout livre.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Prénom et nom</label>
            <input className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" value={D.nom} onChange={e => setD({...D, nom: e.target.value})} placeholder="Jean Dupont" /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Ton rôle <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Pasteur','Évangéliste','Enseignant biblique','Prophète','Apôtre','Auteur laïc','Autre'].map(v => <Chip key={v} field="role" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Années de ministère : <span className="text-violet-600 font-semibold">{D.annees} ans</span></label>
            <input type="range" min="1" max="45" value={D.annees} onChange={e => setD({...D, annees: e.target.value})} className="w-full accent-violet-600" /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Courant théologique <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Évangélique','Pentecôtiste','Charismatique','Baptiste','Réformé','Interconfessionnel','Autre'].map(v => <Chip key={v} field="courant" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Pays / contexte culturel</label>
            <input className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" value={D.pays} onChange={e => setD({...D, pays: e.target.value})} placeholder="France, Afrique francophone..." /></div>
        </div>
      )
    },
    {
      tag: '2 / 5', title: 'Ton style de prédication',
      desc: 'Ta voix écrite naît de ta voix orale.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Ton dominant <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Pastoral et bienveillant','Prophétique et direct','Enseignant et structuré','Narratif et storytelling','Apologétique et argumenté','Exhortatif et mobilisateur'].map(v => <Chip key={v} field="ton" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Illustrations <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Anecdotes personnelles','Exemples bibliques avant tout','Analogies du quotidien','Faits historiques','Peu d\'illustrations'].map(v => <Chip key={v} field="illus" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Niveau théologique : <span className="text-violet-600 font-semibold">{['','Très accessible','Accessible','Intermédiaire','Avancé','Académique'][D.theo]}</span></label>
            <input type="range" min="1" max="5" value={D.theo} onChange={e => setD({...D, theo: e.target.value})} className="w-full accent-violet-600" /></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Structure habituelle</label>
            <div className="flex flex-wrap gap-2 mt-1">{['Texte → explication → application','Thèse + 3 points','Narration → révélation','Question → réponse → appel','Libre / variable'].map(v => <Chip key={v} field="struct" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Questions rhétoriques</label>
            <div className="flex flex-wrap gap-2 mt-1">{['Oui, souvent','Parfois','Rarement'].map(v => <Chip key={v} field="rhet" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Formules récurrentes</label>
            <textarea className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-20" value={D.formules} onChange={e => setD({...D, formules: e.target.value})} placeholder='"La Bible dit clairement...", "Retenez ceci..."' /></div>
        </div>
      )
    },
    {
      tag: '3 / 5', title: 'Ta voix écrite',
      desc: 'Comment veux-tu sonner dans tes livres ?',
      content: (
        <div className="space-y-5">
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Adaptation oral → écrit <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Fidèle à l\'oral','Plus structuré et épuré','Plus intime et personnel','Plus académique','Plus accessible'].map(v => <Chip key={v} field="adapt" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Version biblique <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Louis Segond 1910','Segond 21','Bible du Semeur','Martin 1744','Ostervald','Variable selon passage'].map(v => <Chip key={v} field="bible" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Langue d\'écriture <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Français','Anglais','Espagnol','Autre'].map(v => <Chip key={v} field="langue" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">À ne jamais écrire</label>
            <textarea className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-20" value={D.jamais} onChange={e => setD({...D, jamais: e.target.value})} placeholder="Langage trop académique, références politiques..." /></div>
        </div>
      )
    },
    {
      tag: '4 / 5', title: 'Ton lectorat habituel',
      desc: 'Les personnes que tu touches en général dans ton ministère.',
      content: (
        <div className="space-y-5">
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Profil <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Nouveaux croyants','Chrétiens en croissance','Leaders et pasteurs','Chercheurs spirituels','Grand public'].map(v => <Chip key={v} field="lecto" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Tranches d\'âge <span className="text-stone-400 font-normal">(plusieurs choix)</span></label>
            <div className="flex flex-wrap gap-2 mt-1">{['Adolescents','Jeunes adultes (18–30)','Adultes (30–50)','Séniors (50+)','Tous âges'].map(v => <Chip key={v} field="age" val={v} />)}</div></div>
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Ta mission profonde comme auteur</label>
            <textarea className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-20" value={D.mission} onChange={e => setD({...D, mission: e.target.value})} placeholder="Ancrer la foi dans une connaissance biblique solide..." /></div>
        </div>
      )
    },
    {
      tag: '5 / 5', title: 'Tes prédications YouTube',
      desc: '2 à 3 liens représentatifs de ton style.',
      content: (
        <div className="space-y-4">
          {[['yt1','Lien 1'],['yt2','Lien 2'],['yt3','Lien 3']].map(([field, label]) => (
            <div key={field}><label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
              <input className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" value={D[field]} onChange={e => setD({...D, [field]: e.target.value})} placeholder="https://youtu.be/..." /></div>
          ))}
          <div><label className="block text-sm font-medium text-stone-700 mb-1">Complément libre</label>
            <textarea className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-20" value={D.extra} onChange={e => setD({...D, extra: e.target.value})} placeholder="Convictions fortes, choses à ne jamais écrire..." /></div>
        </div>
      )
    }
  ]

  const pct = Math.round(((cur + 1) / 5) * 100)

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <a href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">✍️</span>
          <span className="text-xl font-semibold text-stone-800">Le Scribe</span>
        </a>
        <span className="text-sm text-stone-400">Profil auteur</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex justify-between text-xs text-stone-400 mb-2">
            <span>Étape {cur + 1} sur 5</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full">
            <div className="h-full bg-violet-600 rounded-full transition-all" style={{width: pct + '%'}} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <div className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">{sections[cur].tag}</div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">{sections[cur].title}</h1>
          <p className="text-stone-500 text-sm mb-8">{sections[cur].desc}</p>
          {sections[cur].content}
        </div>

        <div className="flex justify-between items-center mt-6">
          {cur > 0
            ? <button onClick={() => setCur(cur - 1)} className="text-sm text-stone-500 hover:text-stone-800">← Retour</button>
            : <div />}
          {cur < 4
            ? <button onClick={() => setCur(cur + 1)} className="bg-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition">Continuer →</button>
            : <button onClick={save} disabled={loading} className="bg-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50">
                {saved ? '✓ Profil sauvegardé !' : loading ? 'Sauvegarde...' : 'Sauvegarder mon profil →'}
              </button>
          }
        </div>
      </div>
    </main>
  )
}

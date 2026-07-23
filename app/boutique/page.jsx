'use client'
import { useState, useEffect } from 'react'

const INTRO_RAW = [
  { t: 'h',  text: 'Un avertissement avant de continuer' },
  { t: 'p',  text: "Ce livre va bouleverser certaines idées reçues. Si vous croyez que l'Église sera enlevée avant la grande tribulation, ce que je vais partager risque de vous déranger. Mais je ne suis pas là pour vous rassurer avec des théories confortables. Je suis là pour vous montrer ce que dit réellement la Bible." },
  { t: 'p',  text: "Je ne suis ni un prophète, ni un théologien diplômé d'une grande université. Je suis simplement quelqu'un qui aime la Parole de Dieu et qui a passé des années à l'étudier avec sérieux. Ce que je partage ici, c'est le fruit de cette recherche. Vous êtes libre d'être d'accord ou non. Mais je vous demande une chose : lisez avec un cœur ouvert et vérifiez tout par vous-même dans les Écritures." },
  { t: 'p',  text: "Comme les chrétiens de Bérée dont parle le livre des Actes, qui « examinaient chaque jour les Écritures pour voir si ce qu'on leur disait était exact » (Actes 17:11), je vous encourage à faire de même avec ce livre." },
  { t: 'h',  text: 'Ce que vous allez découvrir' },
  { t: 'p',  text: 'Dans ce livre, vous allez comprendre :' },
  { t: 'li', text: 'Pourquoi toutes les prédictions passées sur le retour de Jésus se sont soldées par des échecs' },
  { t: 'li', text: 'Quels sont les événements bibliques qui DOIVENT absolument se produire avant le retour du Christ' },
  { t: 'li', text: 'La différence cruciale entre « grande tribulation » et « colère divine » (et pourquoi cette distinction change tout)' },
  { t: 'li', text: "Où se situe exactement l'enlèvement de l'Église dans l'Apocalypse" },
  { t: 'li', text: "Comment comprendre la structure complexe du livre de l'Apocalypse" },
  { t: 'li', text: 'Les hypothèses de dates possibles (sans tomber dans la fausse prophétie)' },
  { t: 'li', text: 'Comment vivre en attente du retour du Christ sans sombrer dans la peur ou la paresse spirituelle' },
  { t: 'h',  text: "Un livre pour l'Église d'aujourd'hui" },
  { t: 'p',  text: "Nous vivons une époque unique. Jamais dans l'histoire de l'humanité autant de signes annoncés par Jésus ne se sont alignés en même temps. La création d'Israël en 1948, la reprise de Jérusalem en 1967, la possibilité d'évangéliser toutes les nations grâce à internet et aux médias numériques, les bouleversements climatiques, les guerres, les famines…" },
  { t: 'p',  text: "Nous sommes la génération dont parle Jésus dans Matthieu 24 : celle qui voit « toutes ces choses ». Et Jésus dit clairement que cette génération ne passera point avant son retour." },
  { t: 'p',  text: "C'est pourquoi ce livre est important maintenant. Pas pour créer de la panique. Pas pour spéculer sur des dates précises. Mais pour vous préparer. Pour que vous compreniez ce qui doit arriver. Pour que vous ne soyez pas pris au dépourvu." },
  { t: 'p',  text: "L'Église a besoin de cette compréhension aujourd'hui. Trop de chrétiens vivent dans l'illusion d'un « enlèvement de confort » qui les sauverait avant toute épreuve. Mais ce n'est pas ce que dit la Bible. Jésus nous a prévenus : « Dans le monde, vous aurez des tribulations » (Jean 16:33)." },
  { t: 'p',  text: "La bonne nouvelle, c'est que nous ne sommes pas destinés à la colère de Dieu. Mais nous devons traverser la grande tribulation. Et pour cela, nous devons être préparés spirituellement, mentalement et physiquement." },
  { t: 'h',  text: 'Ce livre fonctionne comme une enquête' },
  { t: 'p',  text: "Imaginez un détective face à une enquête complexe. Il a un tableau. Des indices. Des fils rouges qui relient les différentes pièces du dossier. Il ne se précipite pas pour conclure avant d'avoir examiné tous les indices. Et à la fin, la conclusion s'impose d'elle-même — pas parce qu'il l'a décidé à l'avance, mais parce que les faits parlent." },
  { t: 'p',  text: "C'est exactement comme cela que fonctionne ce livre. Il y a un tableau — les textes-clés. Il y a des indices — les événements qui doivent se produire. Il y a des fils rouges — les connexions entre Daniel, Matthieu, Paul et Jean. Et à la fin, la chronologie se dessine d'elle-même." },
  { t: 'p',  text: "Je ne vous demande pas de me faire confiance. Je vous demande d'examiner les pièces du dossier avec moi. Et si vous le faites honnêtement, avec un cœur ouvert et une Bible ouverte, je crois que vous arriverez aux mêmes conclusions." },
  { t: 'h',  text: 'Un dernier mot avant de commencer' },
  { t: 'p',  text: "Mon objectif n'est pas de vous faire peur. Mon objectif est de vous préparer." },
  { t: 'p',  text: "Jésus n'a pas caché la vérité à ses disciples. Il leur a dit clairement ce qui allait arriver. Il leur a parlé des persécutions, des faux prophètes, des guerres, des famines, de la grande détresse. Mais il a aussi ajouté : « Celui qui persévérera jusqu'à la fin sera sauvé » (Matthieu 24:13)." },
  { t: 'p',  text: "La compréhension de la chronologie de la fin des temps n'est pas un luxe intellectuel. C'est une nécessité spirituelle. Parce que si vous ne savez pas ce qui doit arriver, vous risquez d'être troublé, secoué, voire de perdre la foi quand les événements se produiront." },
  { t: 'p',  text: "Mais si vous êtes préparé, si vous comprenez, si vous savez que tout cela était écrit, alors vous tiendrez ferme. Vous serez comme un phare dans la tempête pour ceux qui seront perdus." },
  { t: 'p',  text: "Alors, prenez une grande respiration. Ouvrez votre Bible. Et plongez avec moi dans cette étude fascinante de la chronologie de la fin des temps." },
  { t: 'p',  text: "Que le Saint-Esprit vous guide dans cette lecture. Bonne découverte." },
]

const CH1_RAW = [
  { t: 'h',  text: 'Une date, une conviction, un silence' },
  { t: 'p',  text: "Je me souviens encore de ce livre, il y a quelques années : l'auteur — un chrétien convaincu, visiblement sérieux dans son étude de la Bible — annonçait le retour de Jésus pour une date précise. Il avait ses chiffres, ses graphiques, ses tableaux. Il avait l'air tellement sûr de lui." },
  { t: 'p',  text: "La date est passée. Jésus n'est pas revenu." },
  { t: 'p',  text: "Ce n'était pas la première fois. Et malheureusement, ce ne sera probablement pas la dernière. De 1988 à 2012, en passant par l'an 2000, les dates annoncées se sont accumulées — et toutes se sont soldées par le même résultat. Le silence." },
  { t: 'p',  text: "Ce qui frappe, ce n'est pas que des imposteurs aient fait ces prédictions. Ce sont des croyants sincères, des gens qui avaient vraiment étudié leur Bible, qui étaient convaincus d'avoir trouvé la clé. Et ils se sont tous trompés." },
  { t: 'p',  text: 'Pourquoi ? Voilà la question que pose ce chapitre.' },
  { t: 'h',  text: 'Ils ont sauté des étapes' },
  { t: 'p',  text: "La réponse est simple — même si elle dérange. Ils ont sauté des étapes. Ils ont oublié — ou ignoré — des événements que Jésus lui-même a annoncés. Des événements écrits noir sur blanc dans les Écritures, qui n'ont pas encore eu lieu. Et tant qu'ils ne se seront pas produits, le retour du Seigneur ne peut pas avoir lieu." },
  { t: 'p',  text: "Ce n'est pas une question d'interprétation symbolique ou d'opinion théologique. C'est une question de logique élémentaire : si Jésus lui-même dit « il faut d'abord que ceci arrive », alors tant que « ceci » n'est pas arrivé, le retour est impossible. Annoncer une date, c'est ignorer sa propre parole." },
  { t: 'p',  text: "Voilà le problème au cœur de toutes ces prédictions ratées. Non pas un manque de foi, non pas un manque de sérieux dans l'étude — mais un manque d'attention à certains textes-clés que la Bible pose comme des conditions préalables inévitables." },
  { t: 'h',  text: 'Trois conditions avant le retour du Seigneur' },
  { t: 'p',  text: 'Concrètement, la Bible nous annonce au moins trois événements majeurs qui doivent encore se produire avant le retour de Jésus.' },
  { t: 'ln', n: '1', text: "La bonne nouvelle annoncée à toutes les nations : « cet évangile du royaume sera prêché dans le monde entier, pour servir de témoignage à toutes les nations ; alors viendra la fin » (Matthieu 24.14)." },
  { t: 'ln', n: '2', text: "La révélation de l'Antéchrist – « l'homme du péché », « le fils de la perdition » – sera révélé et s'élèvera « au-dessus de tout ce qu'on appelle Dieu » avant « le jour du Seigneur » (2 Thessaloniciens 2)." },
  { t: 'ln', n: '3', text: "L'ouverture du 6ème sceau. Enfin, Jean décrit l'ouverture du sixième sceau comme un cataclysme cosmique sans précédent, en parfaite convergence avec les paroles de Jésus dans Matthieu 24.29." },
  { t: 'p',  text: "Tant que ces trois événements n'ont pas eu lieu, le retour de Christ ne peut pas se produire. C'est précisément parce qu'on a ignoré ces étapes que tant de prédictions passées se sont trompées. Dans les prochains chapitres, nous reviendrons en détail sur chacun de ces éléments." },
  { t: 'h',  text: 'Quand les calculs prennent le pas sur les paroles de Jésus' },
  { t: 'p',  text: "Au fil des siècles, beaucoup de chrétiens ont bâti des chronologies impressionnantes : schémas sur 7000 ans d'histoire, séries de jubilés, concordances de dates, cycles de 50 ou 1000 ans, équations reliant création, croix et retour du Seigneur. Certains systèmes sont d'une cohérence interne remarquable. Ils donnent le sentiment d'avoir enfin trouvé la « clé cachée » qui permet de dater le retour de Jésus." },
  { t: 'p',  text: "Le problème n'est pas l'étude des nombres bibliques en soi, ni l'intérêt pour les jubilés ou les structures prophétiques. Le vrai danger apparaît lorsque ces constructions deviennent la charpente principale, et que l'on fait ensuite entrer de force les textes dans le cadre du calcul. On finit alors par accorder plus de poids à une architecture numérique qu'aux jalons explicites donnés par Jésus lui-même." },
  { t: 'p',  text: "Or, quelles que soient la beauté et la logique d'un système, si sa datation ne tient pas compte de trois points non négociables – l'annonce de l'évangile à toutes les nations, la révélation de « l'homme du péché », et le grand bouleversement cosmique du sixième sceau en convergence avec Matthieu 24.29 – il reste fragile. Un seul postulat erroné sur le point de départ (par exemple la manière de compter les jubilés ou de fixer l'an « 4000 ») suffit alors à faire s'effondrer l'ensemble." },
  { t: 'p',  text: "Dans ce livre, je ferai parfois des hypothèses de chronologie, mais je refuse de fonder ma réflexion sur des calculs qui contourneraient les paroles claires du Seigneur. Les dates sont discutables ; ces trois étapes, elles, ne le sont pas." },
  { t: 'h',  text: 'Pour aller plus loin — Questions de réflexion' },
  { t: 'ln', n: '1', text: "Avez-vous déjà été influencé par une prédiction sur le retour de Jésus ? Comment avez-vous réagi lorsqu'elle ne s'est pas réalisée ?" },
  { t: 'ln', n: '2', text: "Selon vous, pourquoi l'attente du retour de Christ peut-elle amener certains chrétiens à chercher des dates précises malgré l'avertissement de Jésus en Matthieu 24.36 ?" },
  { t: 'ln', n: '3', text: "Quelle différence y a-t-il entre « être vigilant » et « fixer une date » ? Comment la Bible vous guide-t-elle sur ce point ?" },
  { t: 'ln', n: '4', text: "Si certains événements doivent précéder le retour de Christ, comment cela change-t-il votre manière de lire l'actualité à la lumière de la Bible ?" },
  { t: 'ln', n: '5', text: "En quoi la sincérité d'un croyant ne suffit-elle pas à garantir l'exactitude de son interprétation prophétique ? Quelles protections la Bible elle-même propose-t-elle ?" },
]

function buildBlocks(raw) {
  return raw.map((b, i) => {
    if (b.t === 'h') return (
      <p key={i} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 700, color: '#1c1917', margin: '30px 0 14px', lineHeight: 1.4 }}>{b.text}</p>
    )
    if (b.t === 'li') return (
      <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.7, color: '#292524', margin: '0 0 12px', paddingLeft: '26px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, top: 0, color: '#b08e63', fontWeight: 700 }}>•</span>{b.text}
      </p>
    )
    if (b.t === 'ln') return (
      <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.7, color: '#292524', margin: '0 0 16px', paddingLeft: '36px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, top: '2px', width: '24px', height: '24px', borderRadius: '50%', background: '#e8dcc8', color: '#6b5a3e', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.n}</span>{b.text}
      </p>
    )
    return <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.7, color: '#292524', margin: '0 0 16px' }}>{b.text}</p>
  })
}

const TESTIMONIALS = [
  { initials: 'PS', name: 'Patrick Salafranque', role: "Pasteur · Préface · Père de l'auteur",
    quote: "Comme quand on pénètre dans une pièce obscure, si on prend le temps d'y demeurer, l'œil s'adapte et les choses deviennent visibles : c'est bien le but de ce livre. Une approche originale, qui répond à des questions très concrètes — la grande tribulation, le temps de la colère de Dieu, l'enlèvement de l'Église, comment discerner les temps que nous vivons et comment s'y préparer. Merci à Nicolas pour ce travail fouillé, cette vision à 360° de la fin des temps. Ce livre est facile à lire et affermira votre foi dans ce retour imminent de notre merveilleux Sauveur." },
  { initials: 'FB', name: 'François Bernot', role: 'Docteur en physique appliquée · Préface',
    quote: "Se pencher sur la fin des temps en prenant une position claire, limpide et didactisée, c'est faire preuve d'un grand courage, car les contradicteurs sur ce thème sont légion. Alors merci Nicolas, mon ami, d'avoir mouillé ta chemise — et surtout d'avoir effacé la brume qui régnait dans mon esprit sur ce thème qui, autrefois, m'avait passionné." },
  { initials: 'AS', name: 'Aymerick Sroka', role: 'Prophète · Préface',
    quote: "Il y a des livres que l'on lit simplement pour apprendre. Et puis il y a des livres que l'on lit parce qu'ils viennent toucher une urgence, réveiller une conscience et remettre une génération devant une réalité qu'elle ne peut plus ignorer. L'urgence des temps fait partie de ces ouvrages. Il ne cherche pas à produire de la peur : il nous ramène à une vérité simple — Jésus n'a jamais parlé des temps de la fin pour effrayer ses disciples, mais pour les préparer. Ce n'est pas une urgence de panique : c'est une urgence d'alignement, de consécration, de réveil. Car au bout de l'histoire, le dernier mot appartient à l'Agneau. Viens, Seigneur Jésus." },
  { initials: '✦', name: 'Un ami lecteur', role: '',
    quote: "C'est comme une étude biblique — tu pourrais te poser avec le livre et ta Bible à côté. J'apprends énormément, alors que je pensais déjà connaître le sujet. Il y a un travail monstre derrière ces pages : non seulement d'étude, mais aussi de pédagogie. C'est accessible, malgré la profondeur. En tant qu'ami et chrétien qui veut en savoir plus sur le retour de Jésus, c'est hyper enrichissant. Merci grandement." },
]

function Stars({ value, max = 5, size = 'text-xl', interactive = false, onHover, onClick, hover = 0 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = interactive ? (hover || value) > i : value > i
        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onMouseEnter={() => onHover?.(i + 1)}
            onMouseLeave={() => onHover?.(0)}
            onClick={() => onClick?.(i + 1)}
            className={`${size} leading-none ${filled ? 'text-gold' : 'text-muted2'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} bg-transparent border-0 p-0`}
            aria-label={interactive ? `${i + 1} étoile${i > 0 ? 's' : ''}` : undefined}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export default function BoutiquePage() {
  const [emailEpub, setEmailEpub] = useState('')
  const [loadingEpub, setLoadingEpub] = useState(false)
  const [emailLivre, setEmailLivre] = useState('')
  const [loadingLivre, setLoadingLivre] = useState(false)
  const [emailPack3, setEmailPack3] = useState('')
  const [loadingPack3, setLoadingPack3] = useState(false)
  const [emailPack10, setEmailPack10] = useState('')
  const [loadingPack10, setLoadingPack10] = useState(false)
  const [error, setError] = useState('')
  const [excerptOpen, setExcerptOpen] = useState(false)

  const [reviews, setReviews] = useState([])
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHover, setReviewHover] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewState, setReviewState] = useState('idle')

  useEffect(() => {
    fetch('/api/reviews').then(r => r.json()).then(setReviews).catch(() => {})
  }, [])

  function handleBuy(product, email, setLoading) {
    if (!email || !email.includes('@')) {
      setError('Saisis ton adresse email pour continuer.')
      return
    }
    if (product === 'epub') {
      setError('')
      setLoading(true)
      fetch('/api/checkout-livre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, email }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.url) { window.location.href = data.url }
          else { setError(data.error || 'Une erreur est survenue.'); setLoading(false) }
        })
        .catch(() => { setError('Erreur réseau. Réessaie.'); setLoading(false) })
      return
    }
    setError('')
    window.location.href = `/boutique/livraison?product=${product}&email=${encodeURIComponent(email)}`
  }

  async function handleReviewSubmit(e) {
    e.preventDefault()
    if (!reviewRating) return
    setReviewState('loading')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: reviewName, rating: reviewRating, comment: reviewComment }),
      })
      if (res.ok) {
        setReviewState('done')
        setReviewName(''); setReviewRating(0); setReviewComment('')
        fetch('/api/reviews').then(r => r.json()).then(setReviews).catch(() => {})
      } else {
        setReviewState('error')
      }
    } catch {
      setReviewState('error')
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  return (
    <main className="min-h-screen page-glow">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-gold">
          Le Scribe
        </a>
        <span className="text-xs text-muted">Éditions Le Scribe</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Titre éditeur */}
        <p className="text-xs font-medium text-gold/60 uppercase tracking-widest mb-6 text-center">
          Éditions Le Scribe — Premier titre
        </p>

        {/* Bloc principal : couverture + infos */}
        <div className="flex flex-col md:flex-row gap-12 items-start mb-16">

          {/* Couverture flottante */}
          <div className="flex-shrink-0 mx-auto md:mx-0" style={{ animation: 'ls-float 3s ease-in-out infinite' }}>
            <style>{`@keyframes ls-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src="/lurgence-des-temps-couv-v2.png"
                alt="L'urgence des temps — Nicolas Salafranque"
                className="w-52 rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
              />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(201,167,125,.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Infos livre */}
          <div className="flex-1">
            <p className="text-xs font-medium text-gold/60 uppercase tracking-widest mb-3">
              Et si nous étions la génération dont parle Jésus ?
            </p>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-cream leading-tight mb-2">
              L'urgence des temps
            </h1>
            <p className="text-gold text-base mb-1">Nicolas Salafranque</p>
            <p className="text-muted2 text-xs mb-6">Éditions Le Scribe · 2026 · 211 pages · ISBN 979-1098694301</p>

            <p className="text-cream2 text-sm leading-relaxed mb-3">
              Pendant des années, des prédicateurs ont annoncé la fin du monde. Ils se sont trompés — pas par manque de zèle, mais parce qu'ils ont sauté des étapes que Jésus Lui-même a décrites dans les Évangiles.
            </p>
            <p className="text-cream2 text-sm leading-relaxed mb-4">
              En croisant <strong className="text-cream">Daniel, Matthieu 24, 2 Thessaloniciens 2 et l'Apocalypse</strong>, une chronologie se dessine — cohérente, ancrée dans la Parole — qui change tout à la manière dont on aborde la fin des temps.
            </p>
            <ul className="text-sm text-muted space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> La différence cruciale entre « grande tribulation » et « colère divine »</li>
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> Où se situe vraiment l'enlèvement dans la séquence des sceaux</li>
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> Les hypothèses 2029-2032 — sans panique ni obsession des dates</li>
              <li className="flex items-start gap-2"><span className="text-gold text-xs mt-0.5 flex-shrink-0">→</span> Le concept de « Goshen » : bâtir des lieux de refuge</li>
            </ul>
          </div>
        </div>

        {/* Bouton extrait */}
        <div className="text-center mb-10">
          <button
            onClick={() => setExcerptOpen(true)}
            className="text-sm font-semibold text-gold border border-gold/40 px-6 py-2.5 rounded-xl hover:bg-gold/10 transition"
          >
            Lire l'introduction et le chapitre 1 →
          </button>
        </div>

        {/* Overlay extrait */}
        {excerptOpen && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
            onClick={e => { if (e.target === e.currentTarget) setExcerptOpen(false) }}
          >
            <div style={{ background: '#faf7f2', borderRadius: '16px', padding: '40px 36px', maxWidth: '680px', width: '100%', position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,.6)', marginTop: '20px', marginBottom: '20px' }}>
              <button onClick={() => setExcerptOpen(false)}
                style={{ position: 'absolute', top: '16px', right: '20px', background: 'transparent', border: 'none', fontSize: '22px', color: '#9a8060', cursor: 'pointer', lineHeight: 1 }}>×</button>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '11px', fontWeight: 600, color: '#9a8060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>
                Introduction
              </p>
              {buildBlocks(INTRO_RAW)}
              <hr style={{ border: 'none', borderTop: '1px solid #d8d0c0', margin: '40px 0 32px' }} />
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '11px', fontWeight: 600, color: '#9a8060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Chapitre 1
              </p>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: 700, color: '#1c1917', marginBottom: '24px', lineHeight: 1.3 }}>
                Pourquoi tant de chrétiens se sont trompés
              </p>
              {buildBlocks(CH1_RAW)}
              <p style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: '14px', color: '#9a8060', marginTop: '32px', fontStyle: 'italic' }}>
                — Fin de l'extrait —
              </p>
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  onClick={() => setExcerptOpen(false)}
                  style={{ background: '#b08e63', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                  Commander le livre →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Erreur globale */}
        {error && (
          <div className="mb-8 bg-err/10 border border-err/20 text-err text-sm rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        {/* Options d'achat */}
        <div className="grid md:grid-cols-2 gap-6 mb-4">

          {/* EPUB */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Numérique</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  EPUB
                </h2>
                <p className="text-muted text-xs mt-1">Téléchargement immédiat · Compatible toutes liseuses</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold text-cream">9€</span>
              </div>
            </div>

            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Liseuse Kindle, Kobo, Apple Books…</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison instantanée par email</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Aucun frais de port</li>
            </ul>

            <input
              type="email"
              placeholder="ton@email.com"
              value={emailEpub}
              onChange={e => setEmailEpub(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('epub', emailEpub, setLoadingEpub)}
              disabled={loadingEpub}
              className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded-xl hover:bg-gold2 transition disabled:opacity-60">
              {loadingEpub ? 'Redirection…' : 'Acheter l\'EPUB — 9€'}
            </button>
          </div>

          {/* Livre physique */}
          <div className="bg-surface border border-gold/20 rounded-2xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-medium bg-gold/10 text-gold border border-gold/30 px-2 py-0.5 rounded-full">
                Disponible
              </span>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Papier</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  Livre physique
                </h2>
                <p className="text-muted text-xs mt-1">Éditions Le Scribe · 211 pages</p>
              </div>
              <div className="text-right flex-shrink-0 mt-5">
                <span className="text-2xl font-bold text-cream">18,99€</span>
              </div>
            </div>

            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Éditions Le Scribe · 211 pages</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison France, Belgique, Suisse, Luxembourg</li>
            </ul>

            <p className="text-xs text-muted2 mb-3">+ frais d'envoi calculés à l'étape suivante</p>
            <input
              type="email"
              placeholder="ton@email.com"
              value={emailLivre}
              onChange={e => setEmailLivre(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('livre', emailLivre, setLoadingLivre)}
              disabled={loadingLivre}
              className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded-xl hover:bg-gold2 transition disabled:opacity-60">
              {loadingLivre ? 'Redirection…' : 'Commander le livre — 18,99€'}
            </button>
          </div>
        </div>

        {/* Packs groupés */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Pack 3 */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Pack famille · offrir</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  3 exemplaires
                </h2>
                <p className="text-muted text-xs mt-1">16 € / ex. · Économisez 8,97 € vs prix unitaire</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold text-cream">48€</span>
              </div>
            </div>
            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> 3 livres dans le même colis</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Idéal pour offrir à des proches</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison France, Belgique, Suisse, Luxembourg</li>
            </ul>
            <p className="text-xs text-muted2 mb-3">+ frais d'envoi calculés à l'étape suivante</p>
            <input
              type="email"
              placeholder="ton@email.com"
              value={emailPack3}
              onChange={e => setEmailPack3(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('pack3', emailPack3, setLoadingPack3)}
              disabled={loadingPack3}
              className="w-full bg-surface2 border border-border text-cream font-semibold text-sm py-3 rounded-xl hover:border-gold/40 transition disabled:opacity-60">
              {loadingPack3 ? 'Redirection…' : 'Commander le pack — 48€'}
            </button>
          </div>

          {/* Pack Église */}
          <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gold/60 uppercase tracking-widest">Pack Église · diffusion</span>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mt-1">
                  10 exemplaires
                </h2>
                <p className="text-muted text-xs mt-1">14 € / ex. · Remise spéciale communautés</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-2xl font-bold text-cream">140€</span>
              </div>
            </div>
            <ul className="text-sm text-muted space-y-1.5 mb-6 flex-1">
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> 10 livres dans le même colis</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Idéal pour une église, un groupe d'études</li>
              <li className="flex items-center gap-2"><span className="text-ok text-xs">✓</span> Livraison France, Belgique, Suisse, Luxembourg</li>
            </ul>
            <p className="text-xs text-muted2 mb-3">+ frais d'envoi calculés à l'étape suivante</p>
            <input
              type="email"
              placeholder="ton@email.com"
              value={emailPack10}
              onChange={e => setEmailPack10(e.target.value)}
              className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition mb-3"
            />
            <button
              onClick={() => handleBuy('pack10', emailPack10, setLoadingPack10)}
              disabled={loadingPack10}
              className="w-full bg-surface2 border border-border text-cream font-semibold text-sm py-3 rounded-xl hover:border-gold/40 transition disabled:opacity-60">
              {loadingPack10 ? 'Redirection…' : 'Commander le pack — 140€'}
            </button>
          </div>

        </div>

        {/* Paiement sécurisé */}
        <p className="text-center text-xs text-muted2 mt-8">
          EPUB : paiement sécurisé par Stripe · Carte bancaire, Apple Pay, Google Pay
        </p>

        {/* ── Témoignages ──────────────────────────────────────────── */}
        <div className="mt-20 pt-10 border-t border-border">
          <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream mb-8">
            Ce que disent les lecteurs
          </h3>
          <div className="flex flex-col gap-4">
            {TESTIMONIALS.map((t, i) => (
              <blockquote key={i} className="m-0 p-7 bg-surface border border-border border-l-[3px] border-l-gold/60 rounded-2xl">
                <span className="font-[family-name:var(--font-playfair)] text-5xl leading-none text-gold/30 block h-6 mb-1">"</span>
                <p className="font-[family-name:var(--font-playfair)] text-sm italic text-cream2 leading-relaxed mb-5">{t.quote}</p>
                <footer className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-[#d4b896] to-[#b8966c] text-[#0d0d0d] font-[family-name:var(--font-playfair)] font-bold text-sm flex items-center justify-center">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-cream">{t.name}</div>
                    {t.role && <div className="text-xs text-muted mt-0.5">{t.role}</div>}
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>

        {/* ── Avis lecteurs ─────────────────────────────────────────── */}
        <div className="mt-16 pt-10 border-t border-border">
          <div className="flex items-end gap-4 mb-8">
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-cream">
              Avis des lecteurs
            </h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-0.5">
                <Stars value={Math.round(avgRating)} size="text-base" />
                <span className="text-sm text-muted">
                  {avgRating.toFixed(1)} · {reviews.length} avis
                </span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="text-sm text-muted mb-8">Aucun avis pour le moment. Soyez le premier !</p>
          ) : (
            <div className="flex flex-col gap-4 mb-10">
              {reviews.map(r => (
                <div key={r.id} className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} size="text-sm" />
                      <span className="text-sm font-semibold text-cream">{r.name}</span>
                    </div>
                    <span className="text-xs text-muted2">
                      {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-cream leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire d'avis */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h4 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-cream mb-5">
              Laisser un avis
            </h4>

            {reviewState === 'done' ? (
              <div className="text-center py-4">
                <p className="text-ok text-sm mb-1">✓ Merci pour votre avis !</p>
                <p className="text-xs text-muted">Votre avis a bien été enregistré.</p>
                <button
                  onClick={() => setReviewState('idle')}
                  className="mt-4 text-xs text-gold hover:text-gold2 transition"
                >
                  Laisser un autre avis
                </button>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1.5">Votre note *</label>
                  <Stars
                    value={reviewRating}
                    hover={reviewHover}
                    size="text-3xl"
                    interactive
                    onHover={setReviewHover}
                    onClick={setReviewRating}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1.5">Votre prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jean-Pierre"
                    value={reviewName}
                    onChange={e => setReviewName(e.target.value)}
                    maxLength={100}
                    className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1.5">Votre commentaire *</label>
                  <textarea
                    required
                    placeholder="Partagez votre ressenti sur ce livre…"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    className="w-full text-sm bg-surface2 border border-border rounded-lg px-4 py-2.5 text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 transition resize-none"
                  />
                </div>

                {reviewState === 'error' && (
                  <p className="text-xs text-err">Une erreur est survenue. Réessayez.</p>
                )}

                <button
                  type="submit"
                  disabled={reviewState === 'loading' || !reviewRating}
                  className="self-start bg-gold text-bg font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-gold2 transition disabled:opacity-50"
                >
                  {reviewState === 'loading' ? 'Envoi…' : 'Publier mon avis'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* À propos de l'auteur */}
        <div className="mt-16 pt-10 border-t border-border">
          <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-cream mb-4">À propos de l'auteur</h3>
          <p className="text-cream2 text-sm leading-relaxed">
            Nicolas Salafranque est pasteur à l'Église La Rencontre. Il est également le fondateur de
            <a href="https://lescribe.app" className="text-gold hover:text-gold2 transition"> Le Scribe</a>,
            un outil IA qui aide les pasteurs et prédicateurs à transformer leurs prédications en livres.
            <em>L'urgence des temps</em> est son premier ouvrage publié sous les Éditions Le Scribe.
          </p>
        </div>

        {/* Footer Éditions */}
        <div className="mt-12 text-center">
          <p className="text-muted2 text-xs">
            © 2025 Éditions Le Scribe ·{' '}
            <a href="https://lescribe.app" className="hover:text-muted transition">lescribe.app</a>
          </p>
        </div>
      </div>

    </main>
  )
}

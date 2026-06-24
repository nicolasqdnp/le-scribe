'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../components/ThemeProvider'

// ─── Données statiques ────────────────────────────────────────────────────────

const TIERS = [
  { id: 'merci',    price: 5,   ship: 0,  shipKind: 'none',    physical: false, titre: 'Un grand merci',             livraison: '—',            tag: null,             featured: false, visual: 'seal',
    contents: ["Ta reconnaissance & ton nom sur la page des soutiens du site", "Le suivi de la campagne en avant-première"] },
  { id: 'ebook',    price: 9,   ship: 0,  shipKind: 'digital', physical: false, titre: "L'ebook",                    livraison: 'Dès la parution', tag: null,           featured: false, visual: 'ereader',
    contents: ["L'ebook au format EPUB (compatible toutes liseuses)", "Disponible dès la parution, par email"] },
  { id: 'livre',    price: 16,  ship: 3,  shipKind: 'fee',     physical: true,  titre: 'Le livre — tarif lancement', livraison: 'Juillet 2026', tag: 'Tarif lancement', featured: false, visual: 'book',
    contents: ["1 exemplaire papier de L'urgence des temps", "Au tarif de lancement (au lieu de 18,99 €)"] },
  { id: 'dedicace', price: 25,  ship: 0,  shipKind: 'free',    physical: true,  titre: 'Le livre dédicacé',          livraison: 'Juillet 2026', tag: 'Recommandé',      featured: true,  visual: 'book-ereader',
    contents: ["1 exemplaire papier dédicacé par l'auteur", "L'ebook offert en bonus"] },
  { id: 'echange',  price: 40,  ship: 0,  shipKind: 'free',    physical: true,  titre: 'Le livre + un échange',      livraison: 'Juillet 2026', tag: null,             featured: false, visual: 'laptop',
    contents: ["1 exemplaire papier dédicacé", "L'ebook offert", "Un échange visio ou téléphone après ta lecture"] },
  { id: 'pack3',    price: 45,  ship: 5,  shipKind: 'fee',     physical: true,  titre: 'Pack de 3 — à offrir',       livraison: 'Juillet 2026', tag: null,             featured: false, visual: 'stack3',
    contents: ["3 exemplaires papier dédicacés", "Parfait pour offrir autour de toi"] },
  { id: 'eglise',   price: 200, ship: 10, shipKind: 'fee',     physical: true,  titre: "Le pack Église (10 ex.)",    livraison: 'Juillet 2026', tag: null,             featured: false, visual: 'stack10',
    contents: ["10 exemplaires papier", "Pour ta communauté, ton groupe ou ton Église"] },
]

const GOAL = 1000
const CAMPAIGN_END = new Date('2026-07-18T23:59:59Z')
const DAYS_LEFT = Math.max(0, Math.ceil((CAMPAIGN_END - new Date()) / (1000 * 60 * 60 * 24)))

const TOC = [
  { n: '',   titre: 'Introduction' },
  { n: '1',  titre: 'Pourquoi tant de chrétiens se sont trompés' },
  { n: '2',  titre: 'Les cycles divins et leur lien avec la fin des temps' },
  { n: '3',  titre: 'Comment les chrétiens lisent la fin des temps aujourd\'hui' },
  { n: '4',  titre: 'Quatre, pas vingt' },
  { n: '5',  titre: 'L\'Évangile annoncé à toutes les nations' },
  { n: '6',  titre: 'Le rouleau, les sceaux et la structure de l\'Apocalypse' },
  { n: '7',  titre: 'Les fausses théories sur l\'enlèvement de l\'Église' },
  { n: '8',  titre: 'L\'Église passera-t-elle par la grande tribulation ?' },
  { n: '9',  titre: 'Le 5ᵉ sceau est ouvert' },
  { n: '10', titre: 'Le 6ᵉ sceau : clé de la chronologie' },
  { n: '11', titre: 'L\'enlèvement de l\'Église' },
  { n: '12', titre: 'Les trois ans et demi : comprendre la grande tribulation' },
  { n: '13', titre: 'Trompettes et coupes : quand la colère de Dieu se déploie' },
  { n: '14', titre: 'Une chronologie potentielle : 2029, 2032… et après ?' },
  { n: '15', titre: 'Comment se préparer ?' },
  { n: '',   titre: 'Conclusion — Vivre l\'urgence des temps' },
  { n: '',   titre: 'Postface — Une invitation à continuer le chemin' },
]

const TOC_INDENTS = [0, 30, 14, 38, 8, 26, 18, 34, 6, 28, 16, 36, 10, 24, 20, 32, 12, 22]

const FUND_USES = [
  { icon: '📖', titre: 'Le premier tirage',  desc: 'Impression de 300 exemplaires papier, de qualité et à prix juste.' },
  { icon: '✉️', titre: 'Les contreparties',  desc: 'Préparation et envoi des livres dédicacés aux contributeurs.' },
  { icon: '🕊️', titre: 'La diffusion',       desc: 'Offrir le livre en Église et lors d\'événements, là où un lien ne suffit pas.' },
]

const FAQS = [
  { q: "Que se passe-t-il si l'objectif n'est pas atteint ?",   a: "Le livre sera imprimé quoi qu'il arrive : je m'y engage, et je compléterai de ma poche si nécessaire. Ton soutien ne sert donc pas à « décider » si le livre existera, mais à le rendre possible sans que j'aie à tout porter seul — et à imprimer un plus grand tirage pour le diffuser plus largement." },
  { q: 'Quand vais-je recevoir mon livre ?',                     a: "L'ebook est déjà disponible : tu le reçois par email dès la validation de ton paiement. Les exemplaires papier dédicacés, eux, sont expédiés une fois le tirage imprimé (été 2026)." },
  { q: 'Le paiement est-il vraiment sécurisé ?',                 a: "Oui. Les paiements passent par Stripe. Carte bancaire, Apple Pay et Google Pay sont acceptés. Le Scribe ne voit jamais tes données bancaires." },
  { q: 'Puis-je contribuer sans prendre de contrepartie ?',      a: "Bien sûr. Le bouton « Faire un don libre » te permet de soutenir du montant que tu veux. Chaque euro va directement à l'impression." },
  { q: "Le livre n'est-il pas déjà disponible en ligne ?",       a: "Si, en ebook et en impression à la demande. Cette campagne finance un vrai tirage local, de qualité, à prix juste — pour le diffuser en main propre, en Église et lors d'événements." },
]

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

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function buildBlocks(raw) {
  return raw.map((b, i) => {
    if (b.t === 'h') {
      return (
        <p key={i} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 700, color: '#1c1917', margin: '30px 0 14px', lineHeight: 1.4 }}>
          {b.text}
        </p>
      )
    }
    if (b.t === 'li') {
      return (
        <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.7, color: '#292524', margin: '0 0 12px', paddingLeft: '26px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, color: '#b08e63', fontWeight: 700 }}>•</span>
          {b.text}
        </p>
      )
    }
    if (b.t === 'ln') {
      return (
        <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.7, color: '#292524', margin: '0 0 12px', paddingLeft: '26px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, color: '#b08e63', fontWeight: 700 }}>{b.n}.</span>
          {b.text}
        </p>
      )
    }
    return (
      <p key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '17px', lineHeight: 1.85, color: '#292524', margin: '0 0 18px' }}>
        {b.text}
      </p>
    )
  })
}

function shipLabel(tier) {
  if (tier.shipKind === 'none')    return null
  if (tier.shipKind === 'digital') return { text: 'Livraison numérique', color: '#4ade80' }
  if (tier.shipKind === 'free')    return { text: 'Port offert', color: '#4ade80' }
  if (tier.shipKind === 'fee')     return { text: `+${tier.ship}€ de port`, color: '#c9a77d' }
  return null
}

// ─── Composant principal ──────────────────────────────────────────────────────

const COVER = '/lurgence-des-temps-couv-v2.png'

function TierVisual({ visual }) {
  const stage = {
    height: '206px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(201,167,125,.13), #141414 72%)',
    borderBottom: '1px solid #1e1e1e', position: 'relative', overflow: 'hidden',
  }
  let scene = null

  if (visual === 'seal') {
    scene = (
      <div style={{ width: '108px', height: '108px', borderRadius: '50%', background: 'radial-gradient(circle at 38% 30%, #b9472f, #6f1f14 72%)', boxShadow: '0 12px 30px rgba(0,0,0,.55), inset 0 2px 7px rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(201,167,125,.55)' }}>
        <span style={{ fontSize: '40px', color: 'rgba(255,236,212,.92)', lineHeight: 1 }}>✦</span>
      </div>
    )
  } else if (visual === 'book') {
    scene = <img src={COVER} alt="" style={{ height: '158px', borderRadius: '5px', boxShadow: '0 16px 36px rgba(0,0,0,.65)', transform: 'perspective(700px) rotateY(-9deg)' }} />
  } else if (visual === 'ereader') {
    scene = (
      <div style={{ position: 'relative', width: '122px', height: '172px', background: '#0c0c0c', border: '1px solid #2a2a2a', borderRadius: '15px', padding: '9px 9px 16px', boxShadow: '0 16px 36px rgba(0,0,0,.6)' }}>
        <img src={COVER} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} />
        <div style={{ position: 'absolute', bottom: '5px', left: '50%', transform: 'translateX(-50%)', width: '24px', height: '4px', borderRadius: '99px', background: '#2e2e2e' }} />
      </div>
    )
  } else if (visual === 'book-ereader') {
    scene = (
      <div style={{ position: 'relative', width: '200px', height: '186px' }}>
        <div style={{ position: 'absolute', left: '18px', top: '24px', width: '92px', height: '128px', background: '#0c0c0c', border: '1px solid #2a2a2a', borderRadius: '11px', padding: '6px', boxShadow: '0 10px 26px rgba(0,0,0,.55)', transform: 'rotate(-8deg)' }}>
          <img src={COVER} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} />
        </div>
        <img src={COVER} alt="" style={{ position: 'absolute', right: '6px', bottom: '8px', height: '144px', borderRadius: '5px', boxShadow: '0 16px 34px rgba(0,0,0,.62)', transform: 'rotate(7deg)' }} />
      </div>
    )
  } else if (visual === 'laptop') {
    scene = (
      <div style={{ position: 'relative', width: '220px', height: '188px' }}>
        <div style={{ position: 'absolute', left: 0, top: '8px', width: '168px' }}>
          <div style={{ width: '156px', margin: '0 auto', background: '#0c0c0c', border: '2px solid #2a2a2a', borderBottom: 'none', borderRadius: '10px 10px 0 0', padding: '8px' }}>
            <div style={{ position: 'relative', borderRadius: '5px', overflow: 'hidden', aspectRatio: '16 / 10', background: '#1b262d' }}>
              <img src="/photo_nico_profil.jpg" alt="Nicolas Salafranque" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', top: '5px', left: '5px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,.55)', padding: '2px 6px', borderRadius: '99px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80' }} />En direct
              </span>
              <div style={{ position: 'absolute', bottom: '5px', right: '5px', width: '32px', height: '23px', borderRadius: '3px', background: '#33454f', border: '1px solid rgba(255,255,255,.22)' }} />
            </div>
          </div>
          <div style={{ width: '168px', height: '8px', margin: '0 auto', background: 'linear-gradient(#3c3c3c,#202020)', borderRadius: '0 0 7px 7px' }} />
          <div style={{ width: '44px', height: '3px', margin: '0 auto', background: '#2a2a2a', borderRadius: '0 0 4px 4px' }} />
        </div>
        <img src={COVER} alt="" style={{ position: 'absolute', right: '2px', bottom: '6px', height: '128px', borderRadius: '5px', boxShadow: '0 14px 30px rgba(0,0,0,.62)', transform: 'rotate(7deg)' }} />
      </div>
    )
  } else if (visual === 'stack3') {
    scene = (
      <div style={{ position: 'relative', width: '188px', height: '176px' }}>
        <img src={COVER} alt="" style={{ position: 'absolute', left: '50%', top: '50%', height: '134px', borderRadius: '4px', boxShadow: '0 10px 26px rgba(0,0,0,.5)', transform: 'translate(-50%,-50%) translateX(-40px) rotate(-17deg)' }} />
        <img src={COVER} alt="" style={{ position: 'absolute', left: '50%', top: '50%', height: '134px', borderRadius: '4px', boxShadow: '0 10px 26px rgba(0,0,0,.5)', transform: 'translate(-50%,-50%) translateX(40px) rotate(17deg)' }} />
        <img src={COVER} alt="" style={{ position: 'absolute', left: '50%', top: '50%', height: '142px', borderRadius: '4px', boxShadow: '0 14px 30px rgba(0,0,0,.6)', transform: 'translate(-50%,-50%) translateY(-5px)' }} />
      </div>
    )
  } else if (visual === 'stack10') {
    scene = (
      <div style={{ position: 'relative', width: '158px', height: '178px' }}>
        {[[28, 26], [21, 19], [14, 12], [7, 6], [0, 0]].map(([x, y], i, arr) => (
          <img key={i} src={COVER} alt="" style={{ position: 'absolute', left: 0, top: 0, height: '142px', borderRadius: '4px', boxShadow: i === arr.length - 1 ? '0 14px 30px rgba(0,0,0,.6)' : '0 3px 8px rgba(0,0,0,.4)', transform: `translate(${x}px,${y}px)` }} />
        ))}
        <span style={{ position: 'absolute', right: '-2px', bottom: '2px', background: '#c9a77d', color: '#0d0d0d', fontWeight: 700, fontSize: '15px', padding: '5px 13px', borderRadius: '99px', boxShadow: '0 6px 16px rgba(0,0,0,.5)' }}>×10</span>
      </div>
    )
  }
  return <div style={stage}>{scene}</div>
}

export default function CampagnePage() {
  const { theme } = useTheme()
  const [systemDark, setSystemDark]       = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const h = e => setSystemDark(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  const isLight = theme === 'light' || (theme === 'system' && !systemDark)

  const [raised, setRaised]               = useState(0)
  const [displayRaised, setDisplayRaised] = useState(0)
  const [displayPct, setDisplayPct]       = useState(0)
  const [backers, setBackers]             = useState(0)
  const [tierBackers, setTierBackers]     = useState({})
  const [modal, setModal]                 = useState(null)
  const [pickup, setPickup]               = useState(false)
  const [amount, setAmount]               = useState('')
  const [email, setEmail]                 = useState('')
  const [emailError, setEmailError]       = useState(false)
  const [loadingPay, setLoadingPay]       = useState(false)
  const [payError, setPayError]           = useState('')
  const [faqOpen, setFaqOpen]             = useState(0)
  const [excerptOpen, setExcerptOpen]     = useState(false)
  const [showFloat, setShowFloat]         = useState(false)
  const [floatAmount, setFloatAmount]     = useState(0)
  const rafRef = useRef(null)

  // Fetch stats + animation jauge
  useEffect(() => {
    // Fetch stats réelles (raised, backers globaux, tierBackers)
    fetch('/api/campagne/stats')
      .then(r => r.json())
      .then(data => {
        if (data.raised) setRaised(data.raised)
        if (data.backers) setBackers(data.backers)
        if (data.tierBackers) setTierBackers(data.tierBackers)
      })
      .catch(() => {})

    // Animation jauge
    const target = raised
    const dur = 1300
    const t0 = performance.now()
    const ease = k => 1 - Math.pow(1 - k, 3)
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = ease(k)
      setDisplayRaised(Math.round(target * e))
      setDisplayPct(Math.min(100, (target / GOAL) * 100) * e)
      if (k < 1) { rafRef.current = requestAnimationFrame(step) }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, []) // eslint-disable-line

  // Re-run animation quand raised change après le fetch
  useEffect(() => {
    const target = raised
    const dur = 800
    const t0 = performance.now()
    const ease = k => 1 - Math.pow(1 - k, 3)
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = ease(k)
      setDisplayRaised(Math.round(target * e))
      setDisplayPct(Math.min(100, (target / GOAL) * 100) * e)
      if (k < 1) { rafRef.current = requestAnimationFrame(step) }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [raised])

  const handlePay = useCallback(async () => {
    const amt = parseInt(amount, 10) || 0
    if (amt <= 0) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(true)
      return
    }
    setEmailError(false)
    setPayError('')
    setLoadingPay(true)
    const tier_id = modal?.free ? 'don_libre' : modal?.id
    try {
      const res = await fetch('/api/checkout-campagne', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_id, email, amount: amt, pickup }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPayError(data.error || 'Une erreur est survenue.')
        setLoadingPay(false)
      }
    } catch {
      setPayError('Erreur réseau. Réessaie dans un instant.')
      setLoadingPay(false)
    }
  }, [amount, email, modal])

  const openModal = useCallback((tier) => {
    setModal(tier)
    setPickup(false)
    setAmount(tier?.free ? '' : String(tier?.price || ''))
    setEmail('')
    setEmailError(false)
    setPayError('')
    setLoadingPay(false)
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setLoadingPay(false)
  }, [])

  const pct = Math.min(100, (raised / GOAL) * 100)
  const funded = raised >= GOAL

  // ── Styles communs ─────────────────────────────────────────────────────────
  const C = isLight ? {
    bg:        '#f7f4ef',
    surface:   '#eeebe5',
    surface2:  '#e5e0d8',
    surface3:  '#dbd5cc',
    border:    '#cfc9bf',
    border2:   '#c0bab0',
    text:      '#1c1917',
    text2:     '#44403c',
    text3:     '#78716c',
    gold:      '#a07040',
    goldHov:   '#b08050',
    ok:        '#3d7a3d',
    err:       '#c0392b',
    paper:     '#ffffff',
  } : {
    bg:        '#0d0d0d',
    surface:   '#111',
    surface2:  '#161616',
    surface3:  '#191919',
    border:    '#252525',
    border2:   '#2c2c2c',
    text:      '#ede8df',
    text2:     '#c8c3bb',
    text3:     '#7a7570',
    gold:      '#c9a77d',
    goldHov:   '#d4b896',
    ok:        '#4ade80',
    err:       '#e0896b',
    paper:     '#f7f4ef',
  }

  return (
    <>
      <style>{`
        @keyframes ls-fade { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ls-pop  { from { opacity: 0; transform: scale(.94); }      to { opacity: 1; transform: scale(1); } }
        @keyframes ls-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ls-rise  { 0% { opacity: 0; transform: translateY(20px) scale(.8); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(-90px) scale(1.1); } }
        .ls-fade { animation: ls-fade .5s ease both; }
        .ls-pop  { animation: ls-pop  .3s ease both; }
        .ls-float { animation: ls-float 3s ease-in-out infinite; }
        .ls-rise  { animation: ls-rise 1.8s ease forwards; }
        .ls-tier:hover { border-color: #3a3530 !important; background: #161616 !important; }
        .ls-tier-featured:hover { border-color: #c9a77d !important; }
        .ls-btn-gold:hover { background: #d4b896 !important; }
        .ls-btn-outline:hover { border-color: #c9a77d !important; color: #c9a77d !important; }
        .ls-faq-btn:hover { background: #161616 !important; }
        @media (max-width: 600px) { .ls-temoignages-grid { grid-template-columns: 1fr !important; } }
        .ls-nav-link:hover { color: #c9a77d !important; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,13,13,.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <a href="/" style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '20px', fontWeight: 700, color: C.gold, textDecoration: 'none' }}>
            Le Scribe
          </a>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="#histoire" className="ls-nav-link" style={{ fontSize: '13px', color: C.text3, textDecoration: 'none', transition: 'color .2s' }}>Le livre</a>
            <a href="#contreparties" className="ls-nav-link" style={{ fontSize: '13px', color: C.text3, textDecoration: 'none', transition: 'color .2s' }}>Contreparties</a>
            <a
              href="#contreparties"
              style={{ background: C.gold, color: C.bg, fontWeight: 700, fontSize: '13px', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none' }}>
              Je participe
            </a>
            <ThemeToggle />
          </nav>
        </header>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 24px 48px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr)', gap: '64px', alignItems: 'center' }}
          className="ls-fade"
        >
          {/* Couverture flottante */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="ls-float" style={{ position: 'relative' }}>
              <img
                src="/lurgence-des-temps-couv-v2.png"
                alt="L'urgence des temps — Nicolas Salafranque"
                style={{ width: '220px', borderRadius: '12px', boxShadow: '0 24px 80px rgba(0,0,0,.7)', display: 'block' }}
              />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(201,167,125,.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Infos + jauge */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>
              Financement participatif · Éditions Le Scribe
            </p>
            <h1 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: C.text, lineHeight: 1.2, marginBottom: '8px' }}>
              L'urgence des temps
            </h1>
            <p style={{ fontSize: '15px', color: C.gold, marginBottom: '6px' }}>Nicolas Salafranque</p>
            <p style={{ fontSize: '13px', color: C.text3, marginBottom: '24px' }}>
              Et si nous étions la génération dont parle Jésus ?
            </p>

            {/* Jauge */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ background: C.surface2, borderRadius: '99px', height: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ background: `linear-gradient(90deg, ${C.gold}, #e8c99a)`, height: '100%', width: `${displayPct}%`, borderRadius: '99px', transition: 'width .1s linear' }} />
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '28px', fontWeight: 700, color: C.text }}>{displayRaised}€</span>
                  <span style={{ fontSize: '12px', color: C.text3, marginLeft: '6px' }}>sur {GOAL}€</span>
                </div>
                <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: '24px' }}>
                  <span style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '28px', fontWeight: 700, color: C.text }}>{backers}</span>
                  <span style={{ fontSize: '12px', color: C.text3, marginLeft: '6px' }}>contributeurs</span>
                </div>
                <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: '24px' }}>
                  <span style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '28px', fontWeight: 700, color: C.text }}>{DAYS_LEFT}</span>
                  <span style={{ fontSize: '12px', color: C.text3, marginLeft: '6px' }}>jours restants</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href="#contreparties"
                style={{ background: C.gold, color: C.bg, fontWeight: 700, fontSize: '15px', padding: '14px 28px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block' }}>
                Soutenir le projet →
              </a>
              <button
                onClick={() => openModal({ free: true })}
                style={{ background: 'transparent', border: `1px solid ${C.border2}`, color: C.text2, fontSize: '14px', padding: '14px 20px', borderRadius: '12px', cursor: 'pointer' }}
                className="ls-btn-outline">
                Don libre
              </button>
            </div>
          </div>
        </section>

        {/* ── Bandeau objectif atteint ──────────────────────────────────────── */}
        {funded && (
          <div style={{ background: 'rgba(74,222,128,.08)', border: `1px solid rgba(74,222,128,.2)`, padding: '16px 24px', textAlign: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: C.ok, fontWeight: 600 }}>
              ✓ Objectif atteint ! Le financement continue pour un tirage plus large.
            </span>
          </div>
        )}

        {/* ── Corps principal ────────────────────────────────────────────────── */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '48px', alignItems: 'start' }}
            className="campagne-grid">

            {/* ── Colonne gauche ─────────────────────────────────────────────── */}
            <div id="histoire">

              {/* Story */}
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '24px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
                  Et si nous étions la génération dont parle Jésus ?
                </h2>
                <p style={{ fontSize: '15px', color: C.gold, lineHeight: 1.7, marginBottom: '20px', fontStyle: 'italic' }}>
                  Les signes s'accumulent. Les nations s'agitent. Jamais dans l'histoire autant de ce que Jésus a décrit ne s'est aligné en même temps. Ce livre a été écrit pour un temps comme celui-ci — et plus que jamais, il doit être mis entre les mains du plus grand nombre.
                </p>
                <p style={{ fontSize: '15px', color: C.text2, lineHeight: 1.8, marginBottom: '16px' }}>
                  <em>L'urgence des temps</em> existe déjà en ebook et en impression à la demande. Mais ce n'est pas suffisant.
                </p>
                <p style={{ fontSize: '15px', color: C.text2, lineHeight: 1.8, marginBottom: '16px' }}>
                  Un livre, ça se prête, ça s'offre, ça s'ouvre sur une table de nuit ou dans un car de transport. Il y a des endroits — des Églises, des groupes de maison, des rencontres — où un lien ne suffit pas. Il faut un objet. Un vrai livre, qu'on peut tenir dans les mains.
                </p>
                <p style={{ fontSize: '15px', color: C.text2, lineHeight: 1.8, marginBottom: '16px' }}>
                  Cette campagne finance <strong style={{ color: C.text }}>un premier tirage de 300 exemplaires</strong> — imprimés localement, à prix juste, pour être diffusés en main propre.
                </p>
                <p style={{ fontSize: '15px', color: C.text2, lineHeight: 1.8 }}>
                  Si tu crois que ce message mérite d'exister en papier, c'est le moment de le rendre possible.
                </p>
              </section>

              {/* Sommaire */}
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
                  Ce que contient le livre
                </h2>
                <p style={{ fontSize: '14px', color: C.text3, margin: '0 0 22px' }}>211 pages · 15 chapitres + introduction, conclusion et postface</p>

                <div style={{ position: 'relative', padding: '8px 0' }}>
                  <div style={{ height: '22px', margin: '0 -6px', borderRadius: '13px', background: 'linear-gradient(180deg,#9a7b4a,#caa86e 45%,#8a6a3c)', boxShadow: '0 6px 16px rgba(0,0,0,.45), inset 0 2px 3px rgba(255,255,255,.35)', position: 'relative', zIndex: 2 }} />
                  <div style={{ position: 'relative', zIndex: 1, margin: '-6px 6px', padding: '34px 30px', background: 'linear-gradient(165deg,#f6efdd,#ece0c6 60%,#e3d3b2)', boxShadow: '0 18px 40px rgba(0,0,0,.45), inset 0 0 60px rgba(150,110,60,.14)', borderLeft: '1px solid #d8c39a', borderRight: '1px solid #d8c39a' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '14px', background: 'linear-gradient(90deg,rgba(120,86,45,.22),transparent)' }} />
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '14px', background: 'linear-gradient(270deg,rgba(120,86,45,.22),transparent)' }} />
                    {TOC.map((ch, i) => (
                      ch.n ? (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: `0 0 13px ${TOC_INDENTS[i % TOC_INDENTS.length]}px` }}>
                          <span style={{ flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', background: 'radial-gradient(circle at 38% 30%, #a83a26, #6f1f14 72%)', color: '#f3e3c8', fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 7px rgba(0,0,0,.3), inset 0 1px 2px rgba(255,255,255,.25)' }}>{ch.n}</span>
                          <span style={{ fontFamily: 'Georgia, serif', fontSize: '15.5px', color: '#3a2c19', lineHeight: 1.4 }}>{ch.titre}</span>
                        </div>
                      ) : (
                        <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontStyle: 'italic', fontSize: '15px', color: '#9a6f3a', margin: `${i === 0 ? '2px' : '20px'} 0 16px`, letterSpacing: '.02em' }}>✦ &nbsp;{ch.titre}&nbsp; ✦</div>
                      )
                    ))}
                  </div>
                  <div style={{ height: '22px', margin: '0 -6px', borderRadius: '13px', background: 'linear-gradient(180deg,#9a7b4a,#caa86e 45%,#8a6a3c)', boxShadow: '0 6px 16px rgba(0,0,0,.45), inset 0 2px 3px rgba(255,255,255,.35)', position: 'relative', zIndex: 2 }} />
                </div>
              </section>

              {/* Extrait */}
              <section style={{ marginBottom: '48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>
                    Feuilleter le livre
                  </h2>
                  <button
                    onClick={() => setExcerptOpen(true)}
                    style={{ background: C.gold, color: C.bg, fontWeight: 700, fontSize: '13px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>
                    Lire un extrait →
                  </button>
                </div>
              </section>

              {/* Overlay extrait */}
              {excerptOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
                  onClick={e => { if (e.target === e.currentTarget) setExcerptOpen(false) }}>
                  <div className="ls-pop" style={{ background: C.paper, borderRadius: '16px', padding: '40px 36px', maxWidth: '680px', width: '100%', position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,.6)', marginTop: '20px', marginBottom: '20px' }}>
                    <button onClick={() => setExcerptOpen(false)}
                      style={{ position: 'absolute', top: '16px', right: '20px', background: 'transparent', border: 'none', fontSize: '22px', color: '#9a8060', cursor: 'pointer', lineHeight: 1 }}>×</button>
                    <p style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '11px', fontWeight: 600, color: '#9a8060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>
                      Introduction
                    </p>
                    {buildBlocks(INTRO_RAW)}
                    <hr style={{ border: 'none', borderTop: '1px solid #d8d0c0', margin: '40px 0 32px' }} />
                    <p style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '11px', fontWeight: 600, color: '#9a8060', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                      Chapitre 1
                    </p>
                    <p style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#1c1917', marginBottom: '24px', lineHeight: 1.3 }}>
                      Pourquoi tant de chrétiens se sont trompés
                    </p>
                    {buildBlocks(CH1_RAW)}
                    <p style={{ textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: '14px', color: '#9a8060', marginTop: '32px', fontStyle: 'italic' }}>
                      — Fin de l'extrait —
                    </p>
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                      <button
                        onClick={() => { setExcerptOpen(false); openModal(TIERS.find(t => t.id === 'ebook')) }}
                        style={{ background: '#b08e63', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                        Soutenir et lire la suite →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Usages des fonds */}
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '22px', fontWeight: 700, color: C.text, marginBottom: '20px' }}>
                  À quoi servent les fonds ?
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  {FUND_USES.map((u, i) => (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
                      <div style={{ fontSize: '24px', marginBottom: '10px' }}>{u.icon}</div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '6px' }}>{u.titre}</p>
                      <p style={{ fontSize: '13px', color: C.text3, lineHeight: 1.6 }}>{u.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Auteur */}
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '22px', fontWeight: 700, color: C.text, marginBottom: '20px' }}>
                  À propos de l'auteur
                </h2>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <Image src="/photo_nico_profil.jpg" alt="Nicolas Salafranque" width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${C.gold}` }} />
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '6px' }}>Nicolas Salafranque</p>
                    <p style={{ fontSize: '13px', color: C.text3, marginBottom: '10px' }}>Pasteur · Fondateur des Éditions Le Scribe</p>
                    <p style={{ fontSize: '14px', color: C.text2, lineHeight: 1.7 }}>
                      Pasteur à l'Église La Rencontre et fondateur de <a href="https://lescribe.app" style={{ color: C.gold, textDecoration: 'none' }}>Le Scribe</a>,
                      un outil IA qui aide les pasteurs à transformer leurs prédications en livres.
                      <em> L'urgence des temps</em> est son premier ouvrage.
                    </p>
                  </div>
                </div>
              </section>

              {/* Témoignages */}
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '22px', fontWeight: 700, color: C.text, marginBottom: '20px' }}>
                  Ce que disent les lecteurs
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { initials: 'PS', name: "Patrick Salafranque", role: "Pasteur · Préface · Père de l'auteur",
                      quote: "Comme quand on pénètre dans une pièce obscure, si on prend le temps d'y demeurer, l'œil s'adapte et les choses deviennent visibles : c'est bien le but de ce livre. Une approche originale, qui répond à des questions très concrètes — la grande tribulation, le temps de la colère de Dieu, l'enlèvement de l'Église, comment discerner les temps que nous vivons et comment s'y préparer. Merci à Nicolas pour ce travail fouillé, cette vision à 360° de la fin des temps. Ce livre est facile à lire et affermira votre foi dans ce retour imminent de notre merveilleux Sauveur." },
                    { initials: 'FB', name: "François Bernot", role: "Docteur en physique appliquée · Préface",
                      quote: "Se pencher sur la fin des temps en prenant une position claire, limpide et didactisée, c'est faire preuve d'un grand courage, car les contradicteurs sur ce thème sont légion. Alors merci Nicolas, mon ami, d'avoir mouillé ta chemise — et surtout d'avoir effacé la brume qui régnait dans mon esprit sur ce thème qui, autrefois, m'avait passionné." },
                    { initials: 'AS', name: "Aymerick Sroka", role: "Prophète · Préface",
                      quote: "Il y a des livres que l'on lit simplement pour apprendre. Et puis il y a des livres que l'on lit parce qu'ils viennent toucher une urgence, réveiller une conscience et remettre une génération devant une réalité qu'elle ne peut plus ignorer. L'urgence des temps fait partie de ces ouvrages. Il ne cherche pas à produire de la peur : il nous ramène à une vérité simple — Jésus n'a jamais parlé des temps de la fin pour effrayer ses disciples, mais pour les préparer. Ce n'est pas une urgence de panique : c'est une urgence d'alignement, de consécration, de réveil. Car au bout de l'histoire, le dernier mot appartient à l'Agneau. Viens, Seigneur Jésus." },
                    { initials: '✦', name: "Un ami lecteur", role: "Premier lecteur du manuscrit",
                      quote: "C'est comme une étude biblique — tu pourrais te poser avec le livre et ta Bible à côté. J'apprends énormément, alors que je pensais déjà connaître le sujet. Il y a un travail monstre derrière ces pages : non seulement d'étude, mais aussi de pédagogie. C'est accessible, malgré la profondeur. En tant qu'ami et chrétien qui veut en savoir plus sur le retour de Jésus, c'est hyper enrichissant. Merci grandement." },
                  ].map((t, i) => (
                    <blockquote key={i} style={{ margin: 0, padding: '28px 30px', background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: '16px' }}>
                      <span style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '46px', lineHeight: .4, color: C.gold, opacity: .4, display: 'block', height: '24px' }}>"</span>
                      <p style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '16px', fontStyle: 'italic', color: C.text2, lineHeight: 1.85, margin: '0 0 20px' }}>{t.quote}</p>
                      <footer style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ flexShrink: 0, width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg,#d4b896,#b8966c)', color: '#0d0d0d', fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.initials}</div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{t.name}</div>
                          <div style={{ fontSize: '12.5px', color: C.text3, marginTop: '2px' }}>{t.role}</div>
                        </div>
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section style={{ marginBottom: '48px' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '22px', fontWeight: 700, color: C.text, marginBottom: '20px' }}>
                  Questions fréquentes
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {FAQS.map((faq, i) => (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                      <button
                        className="ls-faq-btn"
                        onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                        style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', transition: 'background .2s' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{faq.q}</span>
                        <span style={{ color: C.text3, fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{faqOpen === i ? '−' : '+'}</span>
                      </button>
                      {faqOpen === i && (
                        <div className="ls-fade" style={{ padding: '0 20px 16px' }}>
                          <p style={{ fontSize: '14px', color: C.text2, lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* ── Colonne droite : contreparties (sticky) ─────────────────── */}
            <div id="contreparties" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
                Choisir une contrepartie
              </h2>

              {TIERS.map(tier => {
                const ship = shipLabel(tier)
                const backerCount = tierBackers[tier.id] ?? 0
                return (
                  <div
                    key={tier.id}
                    onClick={() => openModal(tier)}
                    className={tier.featured ? 'ls-tier ls-tier-featured' : 'ls-tier'}
                    style={{
                      background: C.surface,
                      border: `1px solid ${tier.featured ? 'rgba(201,167,125,.55)' : C.border}`,
                      borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
                      position: 'relative', transition: 'border-color .2s',
                      boxShadow: tier.featured ? '0 0 0 1px rgba(201,167,125,.25), 0 16px 40px rgba(0,0,0,.4)' : 'none',
                    }}
                  >
                    {tier.featured && (
                      <div style={{ background: C.gold, color: '#0d0d0d', fontSize: '12px', fontWeight: 700, textAlign: 'center', padding: '6px' }}>
                        ★ Contrepartie à la une
                      </div>
                    )}

                    <TierVisual visual={tier.visual} />

                    <div style={{ padding: '18px 20px 20px' }}>
                      {tier.tag && (
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                          <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', background: 'rgba(201,167,125,.15)', color: C.gold, padding: '3px 9px', borderRadius: '99px' }}>{tier.tag}</span>
                        </div>
                      )}
                      <p style={{ textAlign: 'center', fontSize: '14px', color: C.gold, fontWeight: 600, margin: '0 0 2px' }}>Pour {tier.price} €</p>
                      <h3 style={{ textAlign: 'center', fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '19px', fontWeight: 700, color: C.text, margin: '0 0 16px' }}>{tier.titre}</h3>

                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(tier) }}
                        className="ls-btn-gold"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: C.gold, color: '#0d0d0d', fontWeight: 700, fontSize: '15px', padding: '12px', borderRadius: '99px', border: 'none', cursor: 'pointer', marginBottom: '18px' }}>
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>＋</span> Choisir
                      </button>

                      <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {tier.contents.map((c, i) => (
                          <li key={i} style={{ position: 'relative', paddingLeft: '22px', fontSize: '13px', color: C.text2, lineHeight: 1.5 }}>
                            <span style={{ position: 'absolute', left: '4px', top: 0, color: C.gold, fontWeight: 700 }}>•</span>{c}
                          </li>
                        ))}
                      </ul>

                      {tier.physical && (
                        <p style={{ fontSize: '12px', fontStyle: 'italic', color: C.text3, margin: '0 0 10px' }}>(Visuel du livre non contractuel)</p>
                      )}
                      {tier.livraison !== '—' && (
                        <p style={{ fontSize: '13px', color: C.text2, margin: '0 0 6px' }}>Livraison estimée : <strong style={{ color: C.text }}>{tier.livraison}</strong></p>
                      )}
                      {tier.physical && (
                        <p style={{ fontSize: '12px', fontStyle: 'italic', color: C.text3, margin: '0 0 14px', lineHeight: 1.5 }}>Frais de port en option, calculés au paiement — offerts en remise en main propre.</p>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', paddingTop: '14px', borderTop: `1px solid ${C.border}` }}>
                        {tier.livraison !== '—' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: C.text3, background: C.surface2, padding: '4px 10px', borderRadius: '8px' }}>📅 {tier.livraison}</span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: C.text3, background: C.surface2, padding: '4px 10px', borderRadius: '8px' }}>♥ {backerCount} contribution{backerCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                )
              })}


              {/* Don libre */}
              <button
                onClick={() => openModal({ free: true })}
                style={{ width: '100%', background: 'transparent', border: `1px dashed ${C.border2}`, color: C.text3, fontSize: '14px', padding: '14px', borderRadius: '12px', cursor: 'pointer', transition: 'border-color .2s, color .2s' }}
                className="ls-btn-outline">
                Faire un don libre →
              </button>

              <p style={{ fontSize: '11px', color: C.text3, textAlign: 'center', marginTop: '4px', lineHeight: 1.6 }}>
                Paiement sécurisé par <strong style={{ color: C.text2 }}>Stripe</strong> · CB, Apple Pay, Google Pay<br/>
                <span style={{ opacity: 0.7 }}>La plateforme de paiement utilisée par Amazon, Google et des millions d'entreprises.</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── CTA final ─────────────────────────────────────────────────────── */}
        <section style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '64px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '16px' }}>
            {DAYS_LEFT} jours restants
          </p>
          <h2 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: C.text, marginBottom: '16px', lineHeight: 1.3 }}>
            Ce livre mérite d'exister en papier.
          </h2>
          <p style={{ fontSize: '16px', color: C.text2, marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Chaque contribution — quelle que soit sa taille — rend ce tirage possible.
          </p>
          <a
            href="#contreparties"
            style={{ display: 'inline-block', background: C.gold, color: C.bg, fontWeight: 700, fontSize: '16px', padding: '16px 36px', borderRadius: '12px', textDecoration: 'none' }}
            className="ls-btn-gold">
            Soutenir L'urgence des temps →
          </a>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer style={{ padding: '32px 24px', textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: '12px', color: C.text3 }}>
            © 2026 Éditions Le Scribe ·{' '}
            <a href="https://lescribe.app" style={{ color: C.text3, textDecoration: 'none' }}>lescribe.app</a>
            {' · '}
            <a href="/boutique" style={{ color: C.text3, textDecoration: 'none' }}>Boutique</a>
          </p>
        </footer>

        {/* ── Barre sticky basse ────────────────────────────────────────────── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'rgba(13,13,13,.95)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1, maxWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.text3, marginBottom: '4px' }}>
              <span>{Math.round(pct)}% financé</span>
              <span>{backers} contributeurs</span>
            </div>
            <div style={{ background: C.surface2, borderRadius: '99px', height: '4px', overflow: 'hidden' }}>
              <div style={{ background: `linear-gradient(90deg, ${C.gold}, #e8c99a)`, height: '100%', width: `${pct}%`, borderRadius: '99px' }} />
            </div>
          </div>
          <a
            href="#contreparties"
            style={{ background: C.gold, color: C.bg, fontWeight: 700, fontSize: '14px', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', flexShrink: 0 }}
            className="ls-btn-gold">
            Je participe
          </a>
        </div>
        {/* Espace pour la barre sticky */}
        <div style={{ height: '60px' }} />

        {/* ── Modale ────────────────────────────────────────────────────────── */}
        {modal && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
            <div
              className="ls-pop"
              style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: '18px', padding: '32px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

              {/* Titre modale */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-playfair, "Playfair Display"), Georgia, serif', fontSize: '20px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
                    {modal.free ? 'Don libre' : modal.titre}
                  </h3>
                  {!modal.free && modal.contents && (
                    <p style={{ fontSize: '13px', color: C.text3 }}>{modal.contents.join(' · ')}</p>
                  )}
                  {modal.free && (
                    <p style={{ fontSize: '13px', color: C.text3 }}>Soutenir du montant de ton choix</p>
                  )}
                </div>
                <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: C.text3, fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px' }}>×</button>
              </div>

              {/* Infos livraison */}
              {!modal.free && (
                <div style={{ background: C.surface2, borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px' }}>
                  {modal.livraison !== '—' && (
                    <span style={{ color: C.text3 }}>📦 Livraison : <strong style={{ color: C.text2 }}>{modal.livraison}</strong></span>
                  )}
                  {(() => { const s = shipLabel(modal); return s ? <span style={{ color: s.color }}>{s.text}</span> : null })()}
                </div>
              )}

              {/* Montant */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                  Montant (€)
                </label>
                {modal.free ? (
                  <input
                    type="number"
                    min="1"
                    placeholder="Montant libre..."
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ width: '100%', background: C.surface3, border: `1px solid ${C.border2}`, borderRadius: '10px', padding: '12px 14px', fontSize: '16px', color: C.text, outline: 'none' }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[modal.price, modal.price + 5, modal.price + 10].map(v => (
                      <button
                        key={v}
                        onClick={() => setAmount(String(v))}
                        style={{ flex: 1, minWidth: '70px', background: String(amount) === String(v) ? C.gold : C.surface3, color: String(amount) === String(v) ? C.bg : C.text2, border: `1px solid ${String(amount) === String(v) ? C.gold : C.border2}`, borderRadius: '8px', padding: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}>
                        {v}€
                      </button>
                    ))}
                    <input
                      type="number"
                      min={modal.price}
                      placeholder="Autre"
                      value={!['', String(modal.price), String(modal.price + 5), String(modal.price + 10)].includes(String(amount)) ? amount : ''}
                      onChange={e => setAmount(e.target.value)}
                      style={{ flex: 1, minWidth: '70px', background: C.surface3, border: `1px solid ${C.border2}`, borderRadius: '8px', padding: '10px', fontSize: '15px', color: C.text, outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                )}
              </div>

              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                  Ton adresse email
                </label>
                <input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(false) }}
                  style={{ width: '100%', background: C.surface3, border: `1px solid ${emailError ? C.err : C.border2}`, borderRadius: '10px', padding: '12px 14px', fontSize: '15px', color: C.text, outline: 'none' }}
                />
                {emailError && (
                  <p style={{ fontSize: '12px', color: C.err, marginTop: '6px' }}>Entre une adresse email valide pour continuer.</p>
                )}
              </div>

              {/* Remise en main propre */}
              {!modal.free && modal.physical && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px', cursor: 'pointer', fontSize: '13px', color: C.text2 }}>
                  <input type="checkbox" checked={pickup} onChange={e => setPickup(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: C.gold, flexShrink: 0 }} />
                  <span>Remise en main propre (voisin, collègue, Église) — <strong style={{ color: C.gold }}>frais de port offerts</strong></span>
                </label>
              )}

              {/* Récap frais de port */}
              {!modal.free && modal.ship > 0 && !pickup && (
                <div style={{ background: C.surface2, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: C.text3 }}>
                  {amount ? parseInt(amount, 10) || modal.price : modal.price}€ + {modal.ship}€ de port = <strong style={{ color: C.text }}>{(parseInt(amount, 10) || modal.price) + modal.ship}€ au total</strong>
                </div>
              )}

              {payError && (
                <p style={{ fontSize: '13px', color: C.err, marginBottom: '12px', background: 'rgba(224,137,107,.08)', borderRadius: '8px', padding: '10px 12px' }}>{payError}</p>
              )}

              <button
                onClick={handlePay}
                disabled={loadingPay || !amount}
                style={{ width: '100%', background: loadingPay || !amount ? '#5a5040' : C.gold, color: C.bg, fontWeight: 700, fontSize: '15px', padding: '14px', borderRadius: '12px', border: 'none', cursor: loadingPay || !amount ? 'not-allowed' : 'pointer', transition: 'background .2s' }}
                className={loadingPay || !amount ? '' : 'ls-btn-gold'}>
                {loadingPay ? 'Redirection vers Stripe…' : `Payer ${amount ? (parseInt(amount, 10) || 0) + (pickup ? 0 : (modal.ship || 0)) : ''}€ →`}
              </button>

              <p style={{ fontSize: '11px', color: C.text3, textAlign: 'center', marginTop: '12px' }}>
                Paiement sécurisé · Stripe · CB, Apple Pay, Google Pay
              </p>
            </div>
          </div>
        )}

        {/* ── Particule flottante +X€ ───────────────────────────────────────── */}
        {showFloat && (
          <div
            className="ls-rise"
            style={{ position: 'fixed', bottom: '80px', right: '32px', zIndex: 200, background: C.ok, color: '#0d0d0d', fontWeight: 700, fontSize: '18px', padding: '10px 18px', borderRadius: '99px', pointerEvents: 'none' }}>
            +{floatAmount}€
          </div>
        )}
      </div>

      {/* Responsive colonne */}
      <style>{`
        @media (max-width: 900px) {
          .campagne-grid {
            grid-template-columns: 1fr !important;
          }
          #contreparties {
            position: static !important;
          }
        }
        @media (max-width: 600px) {
          section[style*="grid-template-columns: minmax(0,1fr) minmax(0,1.6fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '../../../lib/supabase-server'
import { embedTexts } from '../../../lib/embeddings'
import { checkRateLimit } from '../../../lib/rate-limit'

const anthropic = new Anthropic()

const MODEL = 'claude-sonnet-4-6'

async function withRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 4000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const isOverloaded = msg.includes('overloaded_error') || msg.includes('529')
      if (isOverloaded && i < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error("L'IA est momentanément indisponible. Réessaie dans quelques minutes.")
}

function fixTypo(text: string): string {
  return text
    .replace(/[  ]([?!:;])/g, ' $1')
    .replace(/(\w)([?!:;])/g, '$1 $2')
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1}\s+/gm, '')        // supprime H1 seulement (le titre du chapitre est géré ailleurs)
    .replace(/^[-*]\s+/gm, '')
    // H2 et H3 sont conservés tels quels pour être rendus en titres dans l'éditeur
}

export async function POST(req: NextRequest) {
  try {
    const { chapitreId } = await req.json()
    if (!chapitreId) return NextResponse.json({ error: 'chapitreId manquant' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const rateLimit = await checkRateLimit(supabase, user.id, 'generate-chapter')
    if (rateLimit) return rateLimit

    // Récupérer le chapitre
    const { data: chapitre } = await supabase
      .from('chapitres')
      .select('*, projets_livres(*)')
      .eq('id', chapitreId)
      .eq('user_id', user.id)
      .single()
    if (!chapitre) return NextResponse.json({ error: 'Chapitre introuvable' }, { status: 404 })

    // Vérifier le plan : seul le chapitre 1 est gratuit
    const { data: userPlan } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()
    const planActuel = userPlan?.plan || 'gratuit'

    if (planActuel === 'gratuit' && chapitre.numero !== 1) {
      return NextResponse.json({ error: 'PLAN_LIMIT' }, { status: 402 })
    }

    const projet = chapitre.projets_livres as Record<string, unknown>
    const plan = projet.plan_ia as Record<string, unknown> | null

    // Portrait auteur
    const { data: analysis } = await supabase
      .from('author_profile_analyses')
      .select('portrait')
      .eq('user_id', user.id)
      .maybeSingle()
    const portrait = analysis?.portrait as Record<string, unknown> | null

    const isPreface = chapitre.numero === -1
    const isIntro = chapitre.numero === 0
    const isConclusion = chapitre.numero === 999
    const isRemerciements = chapitre.numero === 998

    // Chapitres déjà validés (contexte)
    // - Introduction : tous les chapitres réguliers validés (pour annoncer le contenu réel)
    // - Conclusion   : tous les chapitres validés sauf la conclusion elle-même
    // - Chapitre régulier : uniquement les chapitres précédents
    let chapitresValidesQuery
    if (isPreface || isIntro) {
      // Préface et Intro : tous les chapitres réguliers validés pour anticiper le contenu
      chapitresValidesQuery = supabase.from('chapitres').select('numero, titre, contenu_final').eq('projet_id', chapitre.projet_id).eq('statut', 'valide').gt('numero', 0).lt('numero', 999).order('numero', { ascending: true })
    } else if (isConclusion || isRemerciements) {
      // Conclusion et Remerciements : tout le livre validé
      chapitresValidesQuery = supabase.from('chapitres').select('numero, titre, contenu_final').eq('projet_id', chapitre.projet_id).eq('statut', 'valide').neq('numero', 999).neq('numero', 998).order('numero', { ascending: true })
    } else {
      chapitresValidesQuery = supabase.from('chapitres').select('numero, titre, contenu_final').eq('projet_id', chapitre.projet_id).eq('statut', 'valide').lt('numero', chapitre.numero).order('numero', { ascending: true })
    }
    const { data: chapitresValides } = await chapitresValidesQuery

    const contexteSection = chapitresValides?.length
      ? chapitresValides.map(c => {
          const label = c.numero === 0 ? 'Introduction' : `Chapitre ${c.numero} — ${c.titre}`
          return `### ${label}\n${c.contenu_final?.slice(0, 1500) || ''}`
        }).join('\n\n')
      : 'Aucun chapitre précédent.'

    // Trouver ce chapitre dans le plan
    let chapPlan: Record<string, unknown> | null = null
    if (isIntro) {
      chapPlan = plan?.introduction as Record<string, unknown> | null
    } else if (isConclusion) {
      chapPlan = plan?.conclusion as Record<string, unknown> | null
    } else {
      chapPlan = (plan?.chapitres as Array<Record<string, unknown>> || []).find(c => c.numero === chapitre.numero) || null
    }

    const portraitSection = portrait ? `
## Style de l'auteur (à respecter impérativement)
- Résumé : ${portrait.resume || ''}
- Ton : ${portrait.ton_dominant || ''}
- Structure : ${portrait.style_structure || ''}
- Relation au lecteur : ${portrait.posture_auctoriale || ''}
- Lexique caractéristique : ${(portrait.lexique_caracteristique as string[] || []).join(', ')}
- À ne jamais écrire : ${(portrait.points_vigilance as string[] || []).join(', ')}
` : ''

    // RAG : cherche les chunks les plus pertinents pour ce chapitre
    let sourceBrutSection = ''
    if (!isPreface && !isIntro && !isConclusion && !isRemerciements && process.env.VOYAGE_API_KEY) {
      try {
        const query = [
          chapitre.titre,
          chapPlan?.message_central,
          (chapPlan?.points_cles as string[] || []).join(', '),
        ].filter(Boolean).join('. ')

        const [queryEmbedding] = await embedTexts([query])

        const { data: chunks } = await supabase.rpc('match_source_chunks', {
          query_embedding: queryEmbedding,
          projet_id_filter: chapitre.projet_id,
          match_count: 5,
        })

        if (chunks?.length > 0) {
          const relevant = (chunks as { content: string; similarity: number }[])
            .filter(c => c.similarity > 0.3)
            .map(c => c.content)
            .join('\n\n---\n\n')
          if (relevant) sourceBrutSection = `\n## Extraits de sources pertinents pour ce chapitre\n${relevant}\n`
        }
      } catch (e) {
        // Fallback : utiliser la source brute directement si le RAG échoue
        console.warn('[generate-chapter] RAG fallback:', (e as Error).message)
        const sourceBrut = (chapPlan?.source_brut as string) || ''
        if (sourceBrut) sourceBrutSection = `\n## Source associée à ce chapitre\n${sourceBrut.slice(0, 6000)}\n`
      }
    } else if (!isPreface && !isIntro && !isConclusion && !isRemerciements) {
      // Pas de clé Voyage : fallback source brute
      const sourceBrut = (chapPlan?.source_brut as string) || ''
      if (sourceBrut) sourceBrutSection = `\n## Source associée à ce chapitre\n${sourceBrut.slice(0, 6000)}\n`
    }

    const struct = (projet.structure_interne as string) || ''
    const structureInstructions = [
      struct.includes('Prière') ? 'Conclus par une courte prière (5 à 8 lignes) en lien direct avec le message du chapitre.' : '',
      struct.includes('Versets') ? 'Isole les versets bibliques clés sur leur propre ligne, avec une ligne vide avant et après.' : '',
      struct.includes('Titres') ? 'Structure le chapitre avec des titres de sous-sections (## Titre) aux vrais changements de thème ou d\'argument — 2 à 5 titres max, courts (3 à 6 mots), dans ton style. Ne commence pas le chapitre par un titre.' : '',
    ].filter(Boolean).join('\n')

    const reglesBase = `REGISTRE : TU ÉCRIS UN LIVRE, PAS UN SERMON

Les sources sont des transcriptions de prédications orales. C'est ta matière première — pas ton modèle. Extrais les idées, les arguments, les illustrations, la théologie. Réécris tout dans un registre d'écrit soigné.

Interdits absolus (marqueurs du discours oral) :
- Interpellations directes de l'auditoire : "vous savez", "regardez", "écoutez", "voyez-vous", "imaginez", "levez la main si", "je vous invite à"
- Apostrophes à une assemblée : "frères et sœurs", "mes amis", "chers lecteurs" en milieu de développement
- Formules de transition oratoires : "passons maintenant à", "dans notre premier point", "nous allons voir ensemble", "j'aimerais vous parler de"
- Onomatopées et approbations : "Amen ?", "C'est bon ?", "Ok ?", "Vous voyez ?"
- Phatiques et remplisseurs : "alors voilà", "en fait", "donc voilà", "bon alors", "hein"
- Répétitions rhétoriques de l'oral : une idée dite trois fois de suite pour marteler — dans un livre, on ne dit qu'une fois, bien
- Incises de commentaire : "— c'est important —", "— et ça c'est clé —", "entre parenthèses"
- Fausse spontanéité : "je me souviens d'un jour où..." pour annoncer une anecdote → développe l'anecdote directement

Ce qui est autorisé et souhaitable :
- La voix, les idées, le style argumentatif et théologique de l'auteur
- Les illustrations et anecdotes — réécrites en prose narrative, pas racontées comme à une assemblée
- Le "vous" ou le "tu" pour s'adresser au lecteur — mais avec parcimonie, comme un essai, pas comme un discours
- Les versets bibliques — intégrés naturellement dans la prose

Règles de langue :
- La négation s'écrit toujours avec "ne" : "ce n'est pas", "il n'y a pas" — jamais "c'est pas", "y a pas"
- Pas de phrases sans verbe conjugué. Toute proposition sans verbe se rattache à la phrase précédente par une virgule ou se complète — jamais isolée par un point.
Espaces insécables avant : ; ? !
Texte brut uniquement — aucun formatage Markdown. Pas d'astérisques, pas de dièses, pas de tirets de liste.`

    const livreSection = `## Le livre
- Titre : ${plan?.titre_final || projet.titre || ''}
- Message clé : ${projet.message_cle || ''}
- Lectorat : ${projet.lectorat || ''}
- Longueur cible du livre : ${projet.longueur || ''}`

    let prompt: string

    if (isPreface) {
      prompt = `Tu es le nègre littéraire de cet auteur. Tu écris dans SA voix, pas dans la tienne.
${reglesBase}

${portraitSection}

${livreSection}

## Chapitres du livre (pour contextualiser la préface)
${contexteSection}

## Ta mission
Rédige la préface de ce livre. Elle doit : expliquer pourquoi l'auteur a écrit ce livre et ce qui l'a poussé à le faire, partager l'histoire personnelle ou le tournant qui est à l'origine de ce projet, dire au lecteur ce qu'il va trouver dans ces pages et comment ce livre peut changer sa vie.
Le ton est personnel, sincère, presque intime — c'est l'auteur qui parle directement au lecteur avant même que le voyage commence.
Commence directement par le texte. Entre 400 et 800 mots. Respecte scrupuleusement le style de l'auteur.`
    } else if (isIntro) {
      prompt = `Tu es le nègre littéraire de cet auteur. Tu écris dans SA voix, pas dans la tienne. Le texte doit être indiscernable de ce qu'il aurait écrit lui-même.

IMPORTANT : Tu écris un livre, pas une transcription de sermon. Le registre doit être celui de l'écrit soigné.
${reglesBase}

${portraitSection}

${livreSection}

## Introduction — ${chapitre.titre}
- Ce que l'introduction doit accomplir : ${chapPlan?.resume || ''}

## Les chapitres du livre (pour que l'introduction annonce le voyage)
${contexteSection}

## Ta mission
Rédige l'introduction en entier. Elle doit : capter l'attention dès la première ligne, présenter l'auteur et poser le problème central, annoncer le voyage que le livre va faire vivre au lecteur et lui donner irrésistiblement envie de tourner la page.
Commence directement par le texte, sans titre ni numéro. Entre 600 et 1200 mots.
Respecte scrupuleusement le style de l'auteur.`
    } else if (isConclusion) {
      prompt = `Tu es le nègre littéraire de cet auteur. Tu écris dans SA voix, pas dans la tienne. Le texte doit être indiscernable de ce qu'il aurait écrit lui-même.

IMPORTANT : Tu écris un livre, pas une transcription de sermon. Le registre doit être celui de l'écrit soigné.
${reglesBase}

${portraitSection}

${livreSection}

## Conclusion — ${chapitre.titre}
- Ce que la conclusion doit accomplir : ${chapPlan?.resume || ''}

## Les chapitres du livre (pour que la conclusion les synthétise)
${contexteSection}

## Ta mission
Rédige la conclusion en entier. Elle doit : synthétiser le message central du livre, rappeler la transformation visée pour le lecteur, terminer sur un appel à l'action concret ou une ouverture vers l'avenir — et laisser une dernière phrase mémorable.
Commence directement par le texte, sans titre ni numéro. Entre 600 et 1200 mots.
Respecte scrupuleusement le style de l'auteur.`
    } else if (isRemerciements) {
      prompt = `Tu es le nègre littéraire de cet auteur. Tu écris dans SA voix, pas dans la tienne.
${reglesBase}

${portraitSection}

${livreSection}

## Ta mission
Rédige la section "Remerciements" de ce livre. Elle doit : remercier Dieu en premier lieu, puis l'entourage proche (famille, conjoint, enfants), puis les personnes qui ont contribué au livre (relecteurs, collègues, mentors), et enfin les lecteurs eux-mêmes.
Le ton est chaleureux, humble et reconnaissant — sans être une liste froide de noms. Chaque remerciement porte une émotion ou une anecdote courte.
Laisse des espaces vides entre crochets là où l'auteur devra insérer les prénoms réels : [prénom du conjoint], [nom du mentor], etc.
Commence directement par le texte. Entre 300 et 600 mots. Respecte le style de l'auteur.`
    } else {
      prompt = `Tu es le nègre littéraire de cet auteur. Tu écris dans SA voix, pas dans la tienne. Le texte doit être indiscernable de ce qu'il aurait écrit lui-même.

IMPORTANT : Tu écris un livre, pas une transcription de sermon. Le style de l'auteur (ton, idées, structure, humour, interpellations) doit être respecté, mais le registre doit être celui de l'écrit soigné.
${reglesBase}

${portraitSection}

${livreSection}
${(() => {
        const elementsTexte = (projet.structure_interne as string || '')
          .split(',').map((s: string) => s.trim())
          .filter((s: string) => !s.includes('Points') && !s.includes('Questions') && !s.includes('réflexion'))
          .join(', ')
        return elementsTexte ? `- Structure de chaque chapitre : ${elementsTexte}` : ''
      })()}

## Ce chapitre (n°${chapitre.numero})
- Titre : ${chapitre.titre}
- Message central : ${chapPlan?.message_central || ''}
- Points clés à couvrir : ${(chapPlan?.points_cles as string[] || []).join(' / ')}
- Versets suggérés : ${(chapPlan?.versets_suggeres as string[] || []).join(', ')}
- Ce chapitre doit accomplir : ${chapPlan?.resume || ''}

## Chapitres précédents déjà validés
${contexteSection}
${sourceBrutSection}
## Ta mission
Rédige ce chapitre en entier. Commence directement par le texte, sans titre ni numéro. Environ 1500 à 2500 mots selon la longueur cible du livre. Respecte scrupuleusement le style de l'auteur.
${structureInstructions}`
    }

    await supabase.from('chapitres').update({ statut: 'en_cours', updated_at: new Date().toISOString() }).eq('id', chapitreId)

    const message = await withRetry(() => anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }))

    const contenu = fixTypo(stripMarkdown(message.content[0].type === 'text' ? message.content[0].text : ''))

    await supabase.from('chapitres').update({
      contenu_ia: contenu,
      statut: 'genere',
      updated_at: new Date().toISOString()
    }).eq('id', chapitreId)

    return NextResponse.json({ contenu })

  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('[generate-chapter]', raw)
    const isOverloaded = raw.includes('overloaded_error') || raw.includes('529')
    const message = isOverloaded
      ? "L'IA est momentanément surchargée. Réessaie dans quelques secondes."
      : raw
    return NextResponse.json({ error: message }, { status: isOverloaded ? 503 : 500 })
  }
}

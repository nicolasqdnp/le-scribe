import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '../../../lib/supabase-server'
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
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
}

export async function POST(req: NextRequest) {
  try {
    const { chapitreId, contenuActuel } = await req.json()
    if (!chapitreId) return NextResponse.json({ error: 'chapitreId manquant' }, { status: 400 })
    if (!contenuActuel?.trim()) return NextResponse.json({ error: 'Aucun contenu à améliorer' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const rateLimit = await checkRateLimit(supabase, user.id, 'improve-chapter')
    if (rateLimit) return rateLimit

    const { data: chapitre } = await supabase
      .from('chapitres')
      .select('*, projets_livres(*)')
      .eq('id', chapitreId)
      .eq('user_id', user.id)
      .single()
    if (!chapitre) return NextResponse.json({ error: 'Chapitre introuvable' }, { status: 404 })

    const projet = chapitre.projets_livres as Record<string, unknown>
    const plan = projet.plan_ia as Record<string, unknown> | null

    const { data: analysis } = await supabase
      .from('author_profile_analyses')
      .select('portrait')
      .eq('user_id', user.id)
      .maybeSingle()
    const portrait = analysis?.portrait as Record<string, unknown> | null

    // Historique du chat pour ce chapitre (contexte des modifications demandées)
    const { data: chatHistory } = await supabase
      .from('chat_messages')
      .select('role, contenu')
      .eq('projet_id', chapitre.projet_id)
      .eq('chapitre_id', chapitreId)
      .order('created_at', { ascending: true })
      .limit(30)

    const chapPlan = (plan?.chapitres as Array<Record<string, unknown>> || []).find(c => c.numero === chapitre.numero)

    const portraitSection = portrait ? `
## Style de l'auteur (à respecter impérativement)
- Résumé : ${portrait.resume || ''}
- Ton : ${portrait.ton_dominant || ''}
- Structure : ${portrait.style_structure || ''}
- Relation au lecteur : ${portrait.posture_auctoriale || ''}
- Lexique caractéristique : ${(portrait.lexique_caracteristique as string[] || []).join(', ')}
- À ne jamais écrire : ${(portrait.points_vigilance as string[] || []).join(', ')}
` : ''

    const struct = (projet.structure_interne as string) || ''
    const structureInstructions = [
      struct.includes('Prière') ? 'Le chapitre doit se conclure par une courte prière (5 à 8 lignes). Si elle est absente, ajoute-la.' : '',
      struct.includes('Versets') ? 'Les versets bibliques clés doivent être isolés sur leur propre ligne, avec une ligne vide avant et après.' : '',
    ].filter(Boolean).join('\n')

    const chatSection = chatHistory?.length
      ? `\n## Modifications demandées par l'auteur dans le chat\n${chatHistory.map(m => `${m.role === 'user' ? 'Auteur' : 'Assistant'} : ${m.contenu}`).join('\n')}\n`
      : ''

    const prompt = `Tu es le nègre littéraire de cet auteur. Tu améliores un chapitre existant en respectant scrupuleusement les modifications déjà apportées.

RÈGLE ABSOLUE : tu conserves intégralement les passages que l'auteur a modifiés ou validés dans le chat. Tu n'as le droit de retoucher que ce qui est clairement insuffisant ou incomplet.

Règles de langue :
- La négation s'écrit toujours avec "ne" : jamais "c'est pas", "y a pas".
- Pas de tournures orales.
- Pas de phrases sans verbe conjugué. Interdit absolu même dans les énumérations : "La première, X." "La seconde, Ésaïe." "Partout. Sans exception." sont des fautes. Reformule : "La première est X." / "La seconde vient d'Ésaïe." / "Partout, sans exception,"
- Espaces insécables avant : ; ? !
- Texte brut uniquement — aucun Markdown, pas d'astérisques ni de dièses.
- Les titres de sections s'intègrent en prose.

${portraitSection}

## Le livre
- Titre : ${plan?.titre_final || projet.titre || ''}
- Message clé : ${projet.message_cle || ''}
- Lectorat : ${projet.lectorat || ''}

## Ce chapitre (n°${chapitre.numero}) — ${chapitre.titre}
- Message central : ${chapPlan?.message_central || ''}
- Ce chapitre doit accomplir : ${chapPlan?.resume || ''}
${struct ? `- Structure attendue : ${struct.split(',').map((s: string) => s.trim()).filter((s: string) => !s.includes('Points') && !s.includes('Questions') && !s.includes('réflexion')).join(', ')}` : ''}
${chatSection}
## Version actuelle du chapitre (à améliorer, pas à réécrire)
${contenuActuel}

## Ta mission
Retourne la version améliorée du chapitre. Garde tout ce qui fonctionne. Corrige uniquement ce qui est insuffisant.
${structureInstructions ? `\nPoints de structure à vérifier et compléter si manquants :\n${structureInstructions}` : ''}
Commence directement par le texte du chapitre, sans commentaire ni explication.`

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
    console.error('[improve-chapter]', raw)
    const isOverloaded = raw.includes('overloaded_error') || raw.includes('529')
    const message = isOverloaded
      ? "L'IA est momentanément surchargée. Réessaie dans quelques secondes."
      : raw
    return NextResponse.json({ error: message }, { status: isOverloaded ? 503 : 500 })
  }
}

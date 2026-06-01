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

export async function POST(req: NextRequest) {
  try {
    const { projetId, chapitreId, message: userMessage } = await req.json()

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const rateLimit = await checkRateLimit(supabase, user.id, 'chat-project')
    if (rateLimit) return rateLimit


    const { data: projet } = await supabase
      .from('projets_livres')
      .select('*')
      .eq('id', projetId)
      .eq('user_id', user.id)
      .single()
    if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { data: analysis } = await supabase
      .from('author_profile_analyses')
      .select('portrait')
      .eq('user_id', user.id)
      .maybeSingle()
    const portrait = analysis?.portrait as Record<string, unknown> | null

    // Tous les chapitres du livre (validés + en cours)
    const { data: tousChapitres } = await supabase
      .from('chapitres')
      .select('id, numero, titre, statut, contenu_final, contenu_ia')
      .eq('projet_id', projetId)
      .order('numero', { ascending: true })

    const chapitresValides = (tousChapitres || []).filter(c => c.statut === 'valide' && c.id !== chapitreId)
    const chapitresValidesSection = chapitresValides.length > 0
      ? `\n## Chapitres déjà rédigés et validés\n${chapitresValides.map(c => {
          const label = c.numero === 0 ? 'Introduction' : c.numero === 999 ? 'Conclusion' : `Chapitre ${c.numero}`
          const contenu = (c.contenu_final || '').slice(0, 3000)
          return `### ${label} — ${c.titre}\n${contenu}${(c.contenu_final || '').length > 3000 ? '\n[…]' : ''}`
        }).join('\n\n')}`
      : ''

    let chapitreContext = ''
    if (chapitreId) {
      const current = (tousChapitres || []).find(c => c.id === chapitreId)
      if (current) {
        chapitreContext = `\n## Chapitre en cours d'édition : ${current.titre}\n${current.contenu_final || current.contenu_ia || ''}`
      }
    }

    // Historique du chat
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, contenu')
      .eq('projet_id', projetId)
      .order('created_at', { ascending: true })
      .limit(20)

    const systemPrompt = `Tu es l'assistant éditorial de cet auteur. Tu l'aides à améliorer, reformuler, développer ou resserrer son texte — toujours dans SA voix, jamais dans la tienne.

Style de l'auteur :
- Ton : ${portrait?.ton_dominant || ''}
- Structure : ${portrait?.style_structure || ''}
- À éviter : ${(portrait?.points_vigilance as string[] || []).join(', ')}

Livre en cours : "${projet.titre || projet.sujet}"
Lectorat : ${projet.lectorat || ''}
${chapitresValidesSection}
${chapitreContext}

IMPORTANT : Français courant et idiomatique. Espaces insécables avant : ; ? ! Réponds de façon concise et actionnable.
Chaque phrase doit avoir un sujet, un verbe et un complément. Interdit : les fragments isolés comme "Partout. Sans exception." — utilise des virgules à la place.

Quand tu proposes un texte destiné à être inséré dans l'éditeur (réécriture, reformulation, passage développé…), place ce texte dans une balise <extrait> … </extrait>. Le reste de ta réponse (commentaires, conseils, remarques) reste en dehors de la balise. Ne place jamais tes commentaires à l'intérieur de la balise.`

    const messages = [
      ...(history || []).map(h => ({ role: h.role as 'user' | 'assistant', content: h.contenu })),
      { role: 'user' as const, content: userMessage }
    ]

    const response = await withRetry(() => anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }))

    const reply = fixTypo(response.content[0].type === 'text' ? response.content[0].text : '')

    // Sauvegarder les messages
    await supabase.from('chat_messages').insert([
      { user_id: user.id, projet_id: projetId, chapitre_id: chapitreId || null, role: 'user', contenu: userMessage },
      { user_id: user.id, projet_id: projetId, chapitre_id: chapitreId || null, role: 'assistant', contenu: reply }
    ])

    return NextResponse.json({ reply })

  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('[chat-project]', raw)
    const isOverloaded = raw.includes('overloaded_error') || raw.includes('529')
    const message = isOverloaded
      ? "L'IA est momentanément surchargée. Réessaie dans quelques secondes."
      : raw
    return NextResponse.json({ error: message, overloaded: isOverloaded }, { status: isOverloaded ? 503 : 500 })
  }
}

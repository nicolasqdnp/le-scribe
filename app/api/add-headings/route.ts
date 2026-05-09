import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '../../../lib/supabase-server'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { html } = await req.json()
    if (!html) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Tu es un éditeur littéraire spécialisé en non-fiction. Voici le contenu HTML d'un chapitre de livre.

Ta mission : analyser le texte et insérer des titres de sous-sections (<h2>) aux endroits où le sujet change significativement, pour aider le lecteur à se repérer dans le chapitre.

Règles absolues :
- Ne modifie JAMAIS le texte existant, pas même un mot, une virgule ou une espace
- Insère uniquement des balises <h2>Titre</h2> juste avant certains paragraphes (<p>)
- Les titres : courts (3 à 6 mots), percutants, dans le ton et le registre du texte
- Nombre : 2 à 5 titres maximum par chapitre — seulement aux vrais changements de thème ou d'argument
- Ne commence pas par un H2 (le titre du chapitre H1 est déjà présent)
- Retourne UNIQUEMENT le HTML complet et valide, sans commentaires, sans markdown, sans balises \`\`\`

HTML du chapitre :
${html}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = raw.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()

    return NextResponse.json({ html: clean })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[add-headings]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.LE_SCRIBE_CLAUDE_KEY || process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 3000): Promise<T> {
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

const SYSTEM_PROMPT = `Tu es un expert en mise en page et typographie pour les livres chrétiens et pastoraux. Tu conseilles les pasteurs et auteurs sur la façon de présenter leur texte de manière professionnelle et lisible.

Tes domaines d'expertise :
- Structure et hiérarchie des titres (H1, H2, H3)
- Typographie : polices, tailles, interlignes pour une lecture confortable
- Mise en page des citations bibliques (versets, passages)
- Organisation des chapitres : introduction, développement, application, conclusion
- Listes, encadrés, points clés — quand les utiliser
- Longueur idéale des paragraphes et des chapitres
- Transitions entre sections
- Pages spéciales : préface, dédicace, remerciements, bibliographie
- Pagination et structure d'un livre de 100 à 250 pages

Règles de réponse :
- Réponds toujours en français courant et idiomatique
- Sois concis et pratique — donne des conseils directement actionnables
- Utilise des exemples concrets quand c'est utile
- Adapte tes conseils au contexte pastoral/chrétien
- Espaces insécables avant : ; ? ! (typographie française)
- Maximum 3-4 paragraphes par réponse`

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    const messages = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await withRetry(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages,
      })
    )

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })

  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('[layout-chat]', raw)
    const isOverloaded = raw.includes('overloaded_error') || raw.includes('529')
    return NextResponse.json(
      { error: isOverloaded ? "L'IA est surchargée, réessaie dans quelques secondes." : raw },
      { status: isOverloaded ? 503 : 500 }
    )
  }
}

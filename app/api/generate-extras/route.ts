import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '../../../lib/supabase-server'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { chapitreId } = await req.json()
    if (!chapitreId) return NextResponse.json({ error: 'chapitreId manquant' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: chapitre } = await supabase
      .from('chapitres')
      .select('*, projets_livres(*)')
      .eq('id', chapitreId)
      .eq('user_id', user.id)
      .single()
    if (!chapitre) return NextResponse.json({ error: 'Chapitre introuvable' }, { status: 404 })
    if (chapitre.statut !== 'valide') return NextResponse.json({ error: 'Le chapitre doit être validé avant de générer les éléments pédagogiques' }, { status: 400 })

    const contenu = chapitre.contenu_final || chapitre.contenu_ia || ''
    if (!contenu.trim()) return NextResponse.json({ error: 'Contenu du chapitre vide' }, { status: 400 })

    const projet = chapitre.projets_livres as Record<string, unknown>
    const struct = (projet.structure_interne as string) || ''
    const wantsPoints = struct.includes('Points') || true // toujours générer si demandé
    const wantsQuestions = struct.includes('Questions') || true

    const prompt = `Tu es un éditeur spécialisé en livres chrétiens. À partir du chapitre ci-dessous, génère les éléments pédagogiques demandés.

IMPORTANT : Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks.

Chapitre : "${chapitre.titre}"

${contenu}

Génère :
${wantsPoints ? '- "points_cles" : tableau de 3 à 5 chaînes de caractères résumant les idées essentielles du chapitre, formulées de façon mémorable (une phrase complète chacune).' : ''}
${wantsQuestions ? '- "questions" : tableau de 3 à 5 chaînes de caractères, questions ouvertes invitant le lecteur à s\'approprier le message. Commencer par "Comment", "Quelle", "Pourquoi", "En quoi", etc.' : ''}

Format attendu :
{"points_cles":["...","...","..."],"questions":["...","...","..."]}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    let extras: Record<string, unknown>
    try {
      extras = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })
      extras = JSON.parse(match[0])
    }

    await supabase.from('chapitres').update({ extras, updated_at: new Date().toISOString() }).eq('id', chapitreId)

    return NextResponse.json({ extras })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[generate-extras]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

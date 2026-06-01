import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '../../../lib/supabase-server'
import { checkRateLimit } from '../../../lib/rate-limit'

const anthropic = new Anthropic()

function fixTypo(text: string): string {
  return text
    .replace(/[  ]([?!:;])/g, ' $1')
    .replace(/(\w)([?!:;])/g, '$1 $2')
}

function fixObj(obj: unknown): unknown {
  if (typeof obj === 'string') return fixTypo(obj)
  if (Array.isArray(obj)) return obj.map(fixObj)
  if (obj && typeof obj === 'object')
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, fixObj(v)]))
  return obj
}

export async function POST(req: NextRequest) {
  try {
    const { projetId } = await req.json()
    if (!projetId) return NextResponse.json({ error: 'projetId manquant' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const rateLimit = await checkRateLimit(supabase, user.id, 'analyze-sources')
    if (rateLimit) return rateLimit

    const [{ data: projet }, { data: analysis }, { data: sources }] = await Promise.all([
      supabase.from('projets_livres').select('*').eq('id', projetId).eq('user_id', user.id).single(),
      supabase.from('author_profile_analyses').select('portrait').eq('user_id', user.id).maybeSingle(),
      supabase.from('sources').select('*').eq('projet_id', projetId).eq('usage', 'book_source').order('ordre', { ascending: true })
    ])

    if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const portrait = analysis?.portrait as Record<string, unknown> | null

    // Lire les transcripts déjà stockés dans contenu_brut
    const transcripts = (sources || [])
      .filter((s: { type: string; contenu_brut: string }) => s.type === 'youtube' && s.contenu_brut)
      .map((s: { contenu_brut: string }) => s.contenu_brut.slice(0, 6000).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' '))

    const notes = (sources || [])
      .filter((s: { type: string }) => s.type === 'note')
      .map((s: { contenu_brut: string }) => s.contenu_brut)
      .filter(Boolean)
      .join('\n\n')

    const portraitSection = portrait ? `
## Portrait stylistique de l'auteur
- Ton : ${portrait.ton_dominant || ''}
- Style : ${portrait.style_structure || ''}
- Relation au lecteur : ${portrait.posture_auctoriale || ''}
- À éviter absolument : ${(portrait.points_vigilance as string[] || []).join(', ')}
` : ''

    const sourcesSection = [
      ...transcripts.map((t: string, i: number) => `### Transcription source ${i + 1}\n${t}`),
      notes ? `### Notes de l'auteur\n${notes}` : ''
    ].filter(Boolean).join('\n\n') || 'Aucune source fournie.'

    const prompt = `Tu es un éditeur expert en livres chrétiens. Tu analyses les sources d'un auteur pour proposer un plan de livre structuré, fidèle à sa pensée et à son style.

IMPORTANT : Rédige en français courant et idiomatique, avec des espaces insécables avant : ; ? !

${portraitSection}

## Paramètres du livre
- Titre provisoire : ${projet.titre || 'non défini'}
- Sujet central : ${projet.sujet || 'non défini'}
- Objectif : ${projet.objectif || 'non défini'}
- Lectorat cible : ${projet.lectorat || 'non défini'}
- Transformation visée : ${projet.transformation || 'non défini'}
- Nombre de chapitres souhaité : ${projet.nb_chapitres || 7}
- Longueur cible : ${projet.longueur || 'non défini'}
- Structure interne : ${projet.structure_interne || 'non défini'}
- Message clé : ${projet.message_cle || 'non défini'}
- À inclure : ${projet.a_inclure || 'non défini'}
- À éviter : ${projet.a_eviter || 'non défini'}
${projet.plan_existant ? `- Plan existant fourni par l'auteur :\n${projet.plan_existant}` : ''}

## Sources (prédications, notes, matière première)
${sourcesSection}

## Ta mission
Produis un plan de livre complet. Réponds UNIQUEMENT avec un JSON valide, sans markdown :

{"titre_final":"Titre du livre (affine si nécessaire)","introduction":{"titre":"Titre de l'introduction","resume":"Ce que l'introduction doit accomplir en 2-3 phrases"},"chapitres":[{"numero":1,"titre":"Titre du chapitre","message_central":"L'idée principale en une phrase","points_cles":["Point 1","Point 2","Point 3"],"versets_suggeres":["Référence 1"],"resume":"Ce que ce chapitre accomplit pour le lecteur"}],"conclusion":{"titre":"Titre de la conclusion","resume":"Ce que la conclusion doit accomplir"},"note_editoriale":"Observation sur la cohérence du plan, les forces, ce qu'il faut surveiller"}`

    await supabase.from('projets_livres').update({ statut: 'analyse_en_cours', updated_at: new Date().toISOString() }).eq('id', projetId)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    let plan: Record<string, unknown>
    try {
      plan = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })
      plan = JSON.parse(match[0])
    }

    plan = fixObj(plan) as Record<string, unknown>
    console.log('[analyze-sources] plan généré, sauvegarde…')

    const { error: planError } = await supabase.from('projets_livres').update({
      plan_ia: plan,
      statut: 'plan_propose',
      updated_at: new Date().toISOString()
    }).eq('id', projetId)

    if (planError) {
      console.error('[analyze-sources] erreur sauvegarde plan:', planError)
      return NextResponse.json({ error: 'Erreur sauvegarde plan : ' + planError.message }, { status: 500 })
    }
    console.log('[analyze-sources] statut → plan_propose ✓')

    const intro = plan.introduction as { titre?: string } | null
    const conclusion = plan.conclusion as { titre?: string } | null
    const chapitres = [
      ...(intro ? [{ user_id: user.id, projet_id: projetId, numero: 0, titre: intro.titre || 'Introduction', statut: 'vide' }] : []),
      ...(plan.chapitres as Array<{ numero: number; titre: string }> || []).map(ch => ({
        user_id: user.id, projet_id: projetId, numero: ch.numero, titre: ch.titre, statut: 'vide'
      })),
      ...(conclusion ? [{ user_id: user.id, projet_id: projetId, numero: 999, titre: conclusion.titre || 'Conclusion', statut: 'vide' }] : []),
    ]

    if (chapitres.length > 0) {
      await supabase.from('chapitres').delete().eq('projet_id', projetId)
      const { error: chapError } = await supabase.from('chapitres').insert(chapitres)
      if (chapError) console.error('[analyze-sources] erreur insertion chapitres:', chapError)
      else console.log(`[analyze-sources] ${chapitres.length} chapitres créés ✓`)
    }

    return NextResponse.json({ ok: true })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[analyze-sources]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

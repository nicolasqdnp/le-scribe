import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'
import { checkRateLimit } from '../../../lib/rate-limit'

// Quota de projets par plan (null = illimité)
const PROJET_QUOTA: Record<string, number | null> = {
  gratuit: 1,      // 1 livre gratuit, chapitre 1 seulement
  forfait: 5,
  premium: null,
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const rateLimit = await checkRateLimit(supabase, user.id, 'create-project')
    if (rateLimit) return rateLimit

    // Vérifier le plan
    const { data: planRow } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()
    const plan = planRow?.plan || 'gratuit'
    const quota = PROJET_QUOTA[plan] ?? null

    if (quota !== null) {
      const { count } = await supabase
        .from('projets_livres')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count ?? 0) >= quota) {
        return NextResponse.json(
          { error: 'QUOTA_LIVRES', quota, plan },
          { status: 402 }
        )
      }
    }

    // Créer le projet
    const body = await req.json()
    const {
      titre, sujet, objectif, lectorat, transformation,
      nb_chapitres, longueur, structure_interne, plan_existant,
      ton, a_inclure, a_eviter, message_cle, sources
    } = body

    const { data: projet, error: projetError } = await supabase
      .from('projets_livres')
      .insert({
        user_id: user.id, titre, sujet, objectif, lectorat, transformation,
        nb_chapitres, longueur, structure_interne, plan_existant,
        ton, a_inclure, a_eviter, message_cle, statut: 'nouveau'
      })
      .select()
      .single()

    if (projetError || !projet) {
      return NextResponse.json(
        { error: projetError?.message || 'Erreur création projet' },
        { status: 500 }
      )
    }

    // Créer les sources
    if (sources?.length > 0) {
      const sourcesPayload = sources.map((s: Record<string, unknown>) => ({
        ...s,
        user_id: user.id,
        projet_id: projet.id,
      }))
      await supabase.from('sources').insert(sourcesPayload)
    }

    return NextResponse.json({ projetId: projet.id })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[create-project]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

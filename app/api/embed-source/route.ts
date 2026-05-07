import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'
import { embedAndStoreSource } from '../../../lib/embeddings'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { sourceId } = await req.json()
    if (!sourceId) return NextResponse.json({ error: 'sourceId manquant' }, { status: 400 })

    const { data: source } = await supabase
      .from('sources')
      .select('id, projet_id, contenu_brut, label')
      .eq('id', sourceId)
      .eq('user_id', user.id)
      .single()

    if (!source) return NextResponse.json({ error: 'Source introuvable' }, { status: 404 })
    if (!source.contenu_brut?.trim()) return NextResponse.json({ error: 'Source sans contenu' }, { status: 400 })

    const chunks = await embedAndStoreSource(
      supabase, source.id, source.projet_id, user.id, source.contenu_brut
    )

    console.log(`[embed-source] ${source.label} → ${chunks} chunks`)
    return NextResponse.json({ chunks })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[embed-source]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

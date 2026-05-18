import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { createServerSupabase } from '../../../lib/supabase-server'

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]
    const pathMatch = u.pathname.match(/\/(?:live|embed|shorts|v)\/([^/?]+)/)
    if (pathMatch) return pathMatch[1]
    return u.searchParams.get('v')
  } catch { return null }
}

function parseTimeToSeconds(value: string): number | null {
  if (!value?.trim()) return null
  const parts = value.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ])
}

export async function POST(req: NextRequest) {
  try {
    const { sourceId } = await req.json()
    if (!sourceId) return NextResponse.json({ error: 'sourceId manquant' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: source } = await supabase
      .from('sources')
      .select('*, projets_livres(user_id)')
      .eq('id', sourceId)
      .single()

    if (!source) return NextResponse.json({ error: 'Source introuvable' }, { status: 404 })
    if (source.projets_livres?.user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const videoId = extractVideoId(source.url)
    if (!videoId) return NextResponse.json({ error: 'URL YouTube invalide' }, { status: 400 })

    const meta = source.metadata || {}
    const startSec = meta.culteEntier ? parseTimeToSeconds(meta.debut) : null
    const endSec = meta.culteEntier ? parseTimeToSeconds(meta.fin) : null

    let segments: { text: string; start?: number }[] = []
    try {
      segments = await withTimeout(YoutubeTranscript.fetchTranscript(videoId, { lang: 'fr' }), 30000)
    } catch {
      try {
        segments = await withTimeout(YoutubeTranscript.fetchTranscript(videoId), 30000)
      } catch {
        return NextResponse.json({ error: 'Impossible de récupérer le transcript de cette vidéo (sous-titres désactivés ?)' }, { status: 422 })
      }
    }

    if (startSec != null || endSec != null) {
      segments = segments.filter(s => {
        if (startSec != null && (s.start ?? 0) < startSec) return false
        if (endSec != null && (s.start ?? Infinity) > endSec) return false
        return true
      })
    }

    const text = segments.map(s => s.text).join(' ')
    const transcript = text.length > 10000 ? text.slice(0, 10000) + '…' : text

    await supabase.from('sources').update({
      contenu_brut: transcript,
      updated_at: new Date().toISOString()
    }).eq('id', sourceId)

    // Indexation RAG en arrière-plan (ne bloque pas la réponse)
    if (process.env.VOYAGE_API_KEY) {
      const { embedAndStoreSource } = await import('../../../lib/embeddings')
      embedAndStoreSource(supabase, sourceId, source.projet_id, user.id, transcript)
        .catch(e => console.error('[fetch-transcript] embed error:', e.message))
    }

    return NextResponse.json({ done: true, mots: transcript.split(/\s+/).length })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[fetch-transcript]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

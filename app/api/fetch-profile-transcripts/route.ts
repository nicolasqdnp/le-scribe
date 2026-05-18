import { NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'
import { fetchYoutubeTranscript, filterByTime, parseTimeToSeconds } from '../../../lib/youtube-transcript'

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]
    const pathMatch = u.pathname.match(/\/(?:live|embed|shorts|v)\/([^/?]+)/)
    if (pathMatch) return pathMatch[1]
    return u.searchParams.get('v')
  } catch { return null }
}

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profils_auteurs').select('id').eq('user_id', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const { data: sources, error: sourcesError } = await supabase
      .from('sources').select('id, url, metadata')
      .eq('profil_id', profile.id).eq('usage', 'author_style').eq('type', 'youtube')

    console.error('[fetch-profile-transcripts] profil.id=', profile.id, 'sources=', sources?.length ?? 'null', 'error=', sourcesError?.message ?? 'none')

    let fetched = 0, failed = 0
    const results: { url: string; ok: boolean; mots?: number }[] = []

    for (const source of sources || []) {
      const videoId = extractVideoId(source.url)
      if (!videoId) { failed++; results.push({ url: source.url, ok: false }); continue }

      const meta = source.metadata || {}
      const startSec = meta.fullService ? parseTimeToSeconds(meta.start) : null
      const endSec = meta.fullService ? parseTimeToSeconds(meta.end) : null

      let segments = await fetchYoutubeTranscript(videoId)

      if (segments.length === 0) {
        failed++
        results.push({ url: source.url, ok: false })
        continue
      }

      segments = filterByTime(segments, startSec, endSec)

      const text = segments.map(s => s.text).join(' ')
      const transcript = text.length > 10000 ? text.slice(0, 10000) + '…' : text

      await supabase.from('sources').update({
        contenu_brut: transcript,
        updated_at: new Date().toISOString()
      }).eq('id', source.id)

      fetched++
      results.push({ url: source.url, ok: true, mots: transcript.split(/\s+/).length })
    }

    return NextResponse.json({ fetched, failed, results })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[fetch-profile-transcripts]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]
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

async function fetchTranscriptDirect(videoId: string): Promise<{ text: string; start: number }[]> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Referer': `https://www.youtube.com/`,
  }

  for (const lang of ['fr', 'en', '']) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      const res = await fetch(url, { headers })
      if (!res.ok) continue
      const data = await res.json() as { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] }
      if (!data?.events?.length) continue
      const segments = data.events
        .filter(e => e.segs)
        .map(e => ({ start: (e.tStartMs ?? 0) / 1000, text: e.segs!.map(s => s.utf8 ?? '').join('').trim() }))
        .filter(s => s.text)
      if (segments.length > 0) return segments
    } catch { continue }
  }

  // Fallback : scrape la page pour trouver l'URL des captions
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers })
    const html = await pageRes.text()
    const match = html.match(/"captionTracks":\[.*?"baseUrl":"(https:[^"]+)"/)
    if (match) {
      const captionUrl = match[1].replace(/\\u0026/g, '&') + '&fmt=json3'
      const capRes = await fetch(captionUrl, { headers })
      if (capRes.ok) {
        const data = await capRes.json() as { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] }
        return (data?.events || [])
          .filter(e => e.segs)
          .map(e => ({ start: (e.tStartMs ?? 0) / 1000, text: e.segs!.map(s => s.utf8 ?? '').join('').trim() }))
          .filter(s => s.text)
      }
    }
  } catch { /* silence */ }

  return []
}

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profils_auteurs').select('id').eq('user_id', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    const { data: sources } = await supabase
      .from('sources').select('id, url, metadata')
      .eq('profil_id', profile.id).eq('usage', 'author_style').eq('type', 'youtube')

    let fetched = 0, failed = 0
    const results: { url: string; ok: boolean; mots?: number }[] = []

    for (const source of sources || []) {
      const videoId = extractVideoId(source.url)
      if (!videoId) { failed++; results.push({ url: source.url, ok: false }); continue }

      const meta = source.metadata || {}
      const startSec = meta.fullService ? parseTimeToSeconds(meta.start) : null
      const endSec = meta.fullService ? parseTimeToSeconds(meta.end) : null

      let segments = await fetchTranscriptDirect(videoId)

      if (segments.length === 0) {
        failed++
        results.push({ url: source.url, ok: false })
        continue
      }

      if (startSec != null || endSec != null) {
        segments = segments.filter(s => {
          if (startSec != null && s.start < startSec) return false
          if (endSec != null && s.start > endSec) return false
          return true
        })
      }

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

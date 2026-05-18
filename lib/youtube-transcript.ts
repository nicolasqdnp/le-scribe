import { YoutubeTranscript } from 'youtube-transcript'

export type Segment = { text: string; start: number }

// Méthode 1 : package youtube-transcript (même approche que fetch-transcript pour les livres)
async function viaYoutubeTranscriptPackage(videoId: string): Promise<Segment[]> {
  for (const lang of ['fr', 'en', undefined]) {
    try {
      const opts = lang ? { lang } : {}
      const segs = await YoutubeTranscript.fetchTranscript(videoId, opts)
      if (segs.length > 0)
        return segs.map(s => ({ text: s.text.trim(), start: s.offset ?? 0 })).filter(s => s.text)
    } catch { continue }
  }
  return []
}

// Méthode 2 : InnerTube /youtubei/v1/get_transcript (API interne YouTube)
async function viaInnerTube(videoId: string): Promise<Segment[]> {
  const vid = Buffer.from(videoId, 'utf8')
  const proto = Buffer.alloc(2 + vid.length)
  proto[0] = 0x0a
  proto[1] = vid.length
  vid.copy(proto, 2)
  const params = proto.toString('base64')

  for (const lang of ['fr', 'en']) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': `${lang}-${lang.toUpperCase()},${lang};q=0.9`,
          'Origin': 'https://www.youtube.com',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`,
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': '2.20231219.04.00',
        },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20231219.04.00', hl: lang, gl: lang === 'fr' ? 'FR' : 'US' } },
          params,
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue
      const data = await res.json() as Record<string, unknown>
      const actions = (data?.actions as Record<string, unknown>[]) || []
      for (const action of actions) {
        const bodyRenderer = (
          ((((action?.updateEngagementPanelAction as Record<string, unknown>)
            ?.content as Record<string, unknown>)
            ?.transcriptRenderer as Record<string, unknown>)
            ?.body as Record<string, unknown>)
            ?.transcriptBodyRenderer as Record<string, unknown>)
        if (!bodyRenderer) continue
        const segments: Segment[] = []
        for (const group of (bodyRenderer.cueGroups as Record<string, unknown>[]) || []) {
          for (const cue of ((group?.transcriptCueGroupRenderer as Record<string, unknown>)?.cues as Record<string, unknown>[]) || []) {
            const r = cue?.transcriptCueRenderer as Record<string, unknown>
            if (!r) continue
            const text = ((r.cue as Record<string, unknown>)?.simpleText as string || '').trim()
            const start = parseInt(r.startOffsetMs as string || '0') / 1000
            if (text) segments.push({ text, start })
          }
        }
        if (segments.length > 0) return segments
      }
    } catch { continue }
  }
  return []
}

// Méthode 3 : Supadata (service tiers, proxies résidentiels — fiable depuis Vercel)
// Nécessite la variable d'env SUPADATA_API_KEY
async function viaSupadata(videoId: string): Promise<Segment[]> {
  const apiKey = process.env.SUPADATA_API_KEY
  if (!apiKey) return []

  try {
    const url = `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
    const res = await fetch(url, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return []
    const data = await res.json() as { content?: { text: string; offset: number }[] | string }
    if (!data?.content) return []

    // Avec text=false (défaut) : tableau de segments avec timestamps
    if (Array.isArray(data.content)) {
      return data.content
        .map(s => ({ text: s.text.trim(), start: (s.offset ?? 0) / 1000 }))
        .filter(s => s.text)
    }

    // Fallback si c'est du texte brut
    if (typeof data.content === 'string' && data.content.trim()) {
      return [{ text: data.content.trim(), start: 0 }]
    }
  } catch { /* silence */ }
  return []
}

// Point d'entrée : essaie les 3 méthodes dans l'ordre
export async function fetchYoutubeTranscript(videoId: string): Promise<Segment[]> {
  const npm = await viaYoutubeTranscriptPackage(videoId)
  if (npm.length > 0) return npm

  const innertube = await viaInnerTube(videoId)
  if (innertube.length > 0) return innertube

  return viaSupadata(videoId)
}

export function filterByTime(segments: Segment[], startSec: number | null, endSec: number | null): Segment[] {
  if (startSec == null && endSec == null) return segments
  return segments.filter(s => {
    if (startSec != null && s.start < startSec) return false
    if (endSec != null && s.start > endSec) return false
    return true
  })
}

export function parseTimeToSeconds(value: string): number | null {
  if (!value?.trim()) return null
  const parts = value.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

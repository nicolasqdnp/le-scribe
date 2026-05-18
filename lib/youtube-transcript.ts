import { YoutubeTranscript } from 'youtube-transcript'

export type Segment = { text: string; start: number }

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms))
  ])
}

// Méthode 1 : package youtube-transcript
async function viaYoutubeTranscriptPackage(videoId: string): Promise<Segment[]> {
  for (const lang of ['fr', 'en', undefined]) {
    try {
      const opts = lang ? { lang } : {}
      const segs = await withTimeout(YoutubeTranscript.fetchTranscript(videoId, opts), 15000)
      if (segs.length > 0)
        return segs.map(s => ({ text: s.text.trim(), start: s.offset ?? 0 })).filter(s => s.text)
    } catch (e) {
      console.error(`[yt-transcript] npm/lang=${lang}:`, (e as Error).message)
    }
  }
  return []
}

// Méthode 2 : InnerTube /youtubei/v1/get_transcript
async function viaInnerTube(videoId: string): Promise<Segment[]> {
  const vid = Buffer.from(videoId, 'utf8')
  const proto = Buffer.alloc(2 + vid.length)
  proto[0] = 0x0a
  proto[1] = vid.length
  vid.copy(proto, 2)
  const params = proto.toString('base64')

  for (const lang of ['fr', 'en']) {
    try {
      const res = await withTimeout(fetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', {
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
      }), 10000)
      if (!res.ok) { console.error(`[yt-transcript] innertube/${lang}: HTTP ${res.status}`); continue }
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
      console.error(`[yt-transcript] innertube/${lang}: réponse OK mais aucun segment`)
    } catch (e) {
      console.error(`[yt-transcript] innertube/${lang}:`, (e as Error).message)
    }
  }
  return []
}

// Méthode 3 : Supadata (proxies résidentiels, non bloqués depuis Vercel)
async function viaSupadata(videoId: string): Promise<Segment[]> {
  const apiKey = process.env.SUPADATA_API_KEY
  if (!apiKey) { console.error('[yt-transcript] supadata: SUPADATA_API_KEY absent'); return [] }

  try {
    const url = `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`
    console.error(`[yt-transcript] supadata: GET ${url}`)
    const res = await withTimeout(fetch(url, {
      headers: { 'x-api-key': apiKey },
    }), 25000)

    const rawText = await res.text()
    console.error(`[yt-transcript] supadata: HTTP ${res.status} — ${rawText.slice(0, 200)}`)

    if (!res.ok) return []
    const data = JSON.parse(rawText) as { content?: { text: string; offset: number }[] | string }
    if (!data?.content) return []

    if (Array.isArray(data.content)) {
      return data.content
        .map(s => ({ text: s.text.trim(), start: (s.offset ?? 0) / 1000 }))
        .filter(s => s.text)
    }

    if (typeof data.content === 'string' && data.content.trim()) {
      return [{ text: data.content.trim(), start: 0 }]
    }
  } catch (e) {
    console.error('[yt-transcript] supadata:', (e as Error).message)
  }
  return []
}

// Point d'entrée : essaie les 3 méthodes dans l'ordre
export async function fetchYoutubeTranscript(videoId: string): Promise<Segment[]> {
  console.error(`[yt-transcript] début pour videoId=${videoId}`)

  const npm = await viaYoutubeTranscriptPackage(videoId)
  if (npm.length > 0) { console.error(`[yt-transcript] succès via npm (${npm.length} segments)`); return npm }

  const innertube = await viaInnerTube(videoId)
  if (innertube.length > 0) { console.error(`[yt-transcript] succès via innertube (${innertube.length} segments)`); return innertube }

  const supadata = await viaSupadata(videoId)
  if (supadata.length > 0) { console.error(`[yt-transcript] succès via supadata (${supadata.length} segments)`); return supadata }

  console.error(`[yt-transcript] toutes les méthodes ont échoué pour videoId=${videoId}`)
  return []
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

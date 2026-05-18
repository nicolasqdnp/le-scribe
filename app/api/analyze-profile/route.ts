import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '../../../lib/supabase-server'

const anthropic = new Anthropic()

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0]
    return u.searchParams.get('v')
  } catch {
    return null
  }
}

function fixTypo(text: string): string {
  return text.replace(/ ([:?!;])/g, ' $1')
}

function fixPortrait(obj: unknown): unknown {
  if (typeof obj === 'string') return fixTypo(obj)
  if (Array.isArray(obj)) return obj.map(fixPortrait)
  if (obj && typeof obj === 'object')
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, fixPortrait(v)]))
  return obj
}

function parseTimeToSeconds(value: string): number | null {
  if (!value?.trim()) return null
  const parts = value.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

// Fetcher direct via l'API timedtext YouTube (moins bloquée que le scraping)
async function fetchTranscriptDirect(videoId: string, lang = 'fr'): Promise<{ text: string; start: number }[]> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Referer': `https://www.youtube.com/watch?v=${videoId}`,
  }

  // Essai 1 : timedtext JSON (sous-titres manuels ou auto)
  for (const l of [lang, 'fr', 'en', '']) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${l}&fmt=json3`
      const res = await fetch(url, { headers })
      if (!res.ok) continue
      const data = await res.json() as { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] }
      if (!data?.events?.length) continue
      return data.events
        .filter(e => e.segs)
        .map(e => ({
          start: (e.tStartMs ?? 0) / 1000,
          text: e.segs!.map(s => s.utf8 ?? '').join('').trim()
        }))
        .filter(s => s.text)
    } catch { continue }
  }

  // Essai 2 : scraper la page pour trouver l'URL des captions
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
          .map(e => ({
            start: (e.tStartMs ?? 0) / 1000,
            text: e.segs!.map(s => s.utf8 ?? '').join('').trim()
          }))
          .filter(s => s.text)
      }
    }
  } catch { /* silence */ }

  return []
}

async function fetchTranscript(videoId: string, startSec?: number | null, endSec?: number | null): Promise<string> {
  let segments = await fetchTranscriptDirect(videoId)

  if (segments.length === 0) return ''

  if (startSec != null || endSec != null) {
    segments = segments.filter(s => {
      if (startSec != null && s.start < startSec) return false
      if (endSec != null && s.start > endSec) return false
      return true
    })
  }

  const text = segments.map(s => s.text).join(' ')
  return text.length > 6000 ? text.slice(0, 6000) + '...' : text
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profils_auteurs')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    // Lire les sources YouTube depuis la table sources
    const { data: sourceRows } = await supabase
      .from('sources')
      .select('url, metadata, contenu_brut')
      .eq('profil_id', profile.id)
      .eq('usage', 'author_style')
      .eq('type', 'youtube')
      .order('ordre', { ascending: true })

    const transcripts: string[] = []

    for (const source of sourceRows || []) {
      // Priorité 1 : contenu déjà stocké en base
      if (source.contenu_brut?.trim()) {
        transcripts.push(source.contenu_brut.slice(0, 6000))
        continue
      }

      // Priorité 2 : fetch direct YouTube
      const videoId = extractVideoId(source.url)
      if (!videoId) continue

      const meta = source.metadata || {}
      const startSec = meta.fullService ? parseTimeToSeconds(meta.start) : null
      const endSec = meta.fullService ? parseTimeToSeconds(meta.end) : null

      const text = await fetchTranscript(videoId, startSec, endSec)
      if (text) transcripts.push(text)
    }

    const transcriptSection = transcripts.length > 0
      ? transcripts.map((t, i) => `### Transcription vidéo ${i + 1}\n${t}`).join('\n\n')
      : 'Aucune transcription disponible — base-toi uniquement sur le formulaire.'

    const profileSummary = `
Nom : ${profile.nom || 'non renseigné'}
Rôle : ${profile.role || 'non renseigné'}
Années de ministère : ${profile.annees_ministere || 'non renseigné'}
Courant théologique : ${profile.courant || 'non renseigné'}
Pays : ${profile.pays || 'non renseigné'}
Contexte culturel : ${profile.contexte_culturel || 'non renseigné'}
Ton dominant : ${profile.ton || 'non renseigné'}
Illustrations : ${profile.illustrations || 'non renseigné'}
Niveau théologique : ${profile.niveau_theologique || 'non renseigné'}/5
Structure : ${profile.structure || 'non renseigné'}
Questions rhétoriques : ${profile.questions_rhetoriques || 'non renseigné'}
Formules récurrentes : ${profile.formules || 'non renseigné'}
Adaptation oral→écrit : ${profile.adaptation || 'non renseigné'}
Version biblique : ${profile.bible || 'non renseigné'}
Langue d'écriture : ${profile.langue || 'non renseigné'}
À ne jamais écrire : ${profile.a_eviter || 'non renseigné'}
Lectorat : ${profile.lectorat || 'non renseigné'}
Tranches d'âge : ${profile.tranches_age || 'non renseigné'}
Mission profonde : ${profile.mission || 'non renseigné'}
`

    const prompt = `Tu es un expert en analyse de style rédactionnel et en écriture pastorale. Tu analyses le profil d'un auteur chrétien pour créer un portrait stylistique précis qui servira à générer des livres qui lui ressemblent vraiment.

IMPORTANT : Rédige en français courant et idiomatique. Évite tout anglicisme ou calque de l'anglais. Par exemple : "il n'est jamais condescendant" et non "il ne condescend jamais", "il interpelle" et non "il challenge", etc.

## Profil auteur (formulaire)
${profileSummary}

## Transcriptions de ses prédications YouTube
${transcriptSection}

## Ta mission
Produis un portrait d'auteur structuré. Les transcriptions révèlent la voix réelle, le formulaire révèle l'intention. Croise les deux.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour, juste le JSON brut :

{"resume":"Portrait synthétique de 3-4 phrases capturant l'essence de cet auteur. Vivant et précis, pas générique.","ton_dominant":"Description précise du ton et de la posture de l'auteur face à son lecteur","style_structure":"Comment il organise typiquement ses messages et argumentations","usage_scripture":"Comment et quand il cite les textes bibliques, avec quelle finalité","lexique_caracteristique":["expression 1","tournure 2","mot récurrent 3"],"appels_action":"Comment il interpelle et mobilise son lecteur","rythme_phrases":"Court et percutant / Long et développé / Mixte — avec description","points_vigilance":["Ce à éviter absolument pour rester fidèle à sa voix"],"forces_stylistiques":["Point fort 1","Point fort 2","Point fort 3"],"posture_auctoriale":"Comment il se positionne face au lecteur — comme un guide, un frère, un enseignant, un témoin...","confiance":{"score":0.8,"note":"Explication du niveau de confiance basé sur les données disponibles"}}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    let portrait: Record<string, unknown>
    try {
      portrait = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })
      portrait = JSON.parse(match[0])
    }

    portrait = fixPortrait(portrait) as Record<string, unknown>

    const { data: existing } = await supabase
      .from('author_profile_analyses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const now = new Date().toISOString()
    const payload = {
      user_id: user.id,
      portrait,
      resume: portrait.resume as string,
      transcripts_count: transcripts.length,
      status: 'done',
      updated_at: now,
    }

    if (existing) {
      await supabase.from('author_profile_analyses').update(payload).eq('user_id', user.id)
    } else {
      await supabase.from('author_profile_analyses').insert({ ...payload, created_at: now })
    }

    return NextResponse.json({ portrait })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[analyze-profile]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

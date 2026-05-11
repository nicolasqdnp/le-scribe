import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { titre, sujet } = await req.json()
    if (!titre) return NextResponse.json({ error: 'Titre manquant' }, { status: 400 })

    const prompt = `Book cover design for a Christian pastoral book titled "${titre}". ${sujet ? `Subject: ${sujet}.` : ''} Professional, elegant, spiritual atmosphere. Soft warm light, deep colors (navy, gold, cream). Abstract or symbolic imagery — cross, light rays, open book, dove, wheat field. No text, no letters, no words. High quality, print-ready illustration.`

    const response = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          input: {
            prompt,
            width: 1024,
            height: 1536,
            num_outputs: 3,
            output_format: 'jpg',
            output_quality: 90,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('[generate-cover] Replicate error:', err)
      return NextResponse.json({ error: 'Erreur génération image' }, { status: 500 })
    }

    const prediction = await response.json()

    // Si la prédiction est encore en cours (Replicate n'a pas attendu)
    if (prediction.status === 'processing' || prediction.status === 'starting') {
      // Poll jusqu'à 60s
      const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const poll = await fetch(pollUrl, {
          headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
        })
        const data = await poll.json()
        if (data.status === 'succeeded') {
          return NextResponse.json({ images: data.output })
        }
        if (data.status === 'failed') {
          return NextResponse.json({ error: 'Génération échouée' }, { status: 500 })
        }
      }
      return NextResponse.json({ error: 'Timeout génération' }, { status: 504 })
    }

    return NextResponse.json({ images: prediction.output })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[generate-cover]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

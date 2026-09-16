import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Chapitres de L'urgence des temps (extraits du M4B)
export const CHAPTERS = [
  { id: 1,  title: 'Page de titre',                                        start: 0 },
  { id: 2,  title: 'Remerciements',                                        start: 61.32 },
  { id: 3,  title: 'Préface 1',                                            start: 164.42 },
  { id: 4,  title: 'Préface 2',                                            start: 260.9 },
  { id: 5,  title: 'Préface 3',                                            start: 399.94 },
  { id: 6,  title: 'Table des matières',                                   start: 589.94 },
  { id: 7,  title: '1 Thessaloniciens 5.1-4',                              start: 667.22 },
  { id: 8,  title: 'Introduction',                                         start: 699.84 },
  { id: 9,  title: 'Chapitre 1 — Pourquoi tant de chrétiens se sont trompés', start: 1034.56 },
  { id: 10, title: 'Chapitre 2 — Les cycles divins et leur lien avec la fin des temps', start: 1318.83 },
  { id: 11, title: 'Chapitre 3 — Comment les chrétiens lisent la fin des temps aujourd\'hui', start: 1822.47 },
  { id: 12, title: 'Chapitre 4 — Quatre, pas vingt',                       start: 2360.18 },
  { id: 13, title: 'Chapitre 5 — L\'Évangile annoncé à toutes les nations', start: 2870.23 },
  { id: 14, title: 'Chapitre 6 — Le rouleau, les sceaux et la structure de l\'Apocalypse', start: 3299.42 },
  { id: 15, title: 'Chapitre 7 — Les fausses théories sur l\'enlèvement de l\'Église', start: 3928.64 },
  { id: 16, title: 'Chapitre 8 — L\'Église passera-t-elle par la grande tribulation ?', start: 4499.75 },
  { id: 17, title: 'Chapitre 9 — Le 5ᵉ sceau est ouvert',                 start: 5239.39 },
  { id: 18, title: 'Chapitre 10 — Le 6ᵉ sceau, clé de la chronologie',    start: 5808.8 },
  { id: 19, title: 'Chapitre 11 — L\'enlèvement de l\'Église',             start: 6333.5 },
  { id: 20, title: 'Chapitre 12 — Les trois ans et demi',                  start: 7181.05 },
  { id: 21, title: 'Chapitre 13 — Trompettes et coupes',                   start: 8211.5 },
  { id: 22, title: 'Chapitre 14 — Une chronologie potentielle',            start: 8705.03 },
  { id: 23, title: 'Chapitre 15 — Comment se préparer ?',                  start: 10875.84 },
  { id: 24, title: 'Conclusion',                                           start: 12321.08 },
  { id: 25, title: 'Postface',                                             start: 12579.64 },
]

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()

  // Vérifier achat dans orders — audiobook inclus avec epub, livre physique et packs
  const AUDIO_PRODUCTS = ['audio', 'epub', 'livre', 'pack3', 'pack10']
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('email', normalizedEmail)
    .in('product', AUDIO_PRODUCTS)
    .eq('status', 'paid')
    .limit(1)
    .single()

  if (!order) {
    // Réponse générique (ne pas révéler si l'email est inconnu)
    return NextResponse.json({ ok: true })
  }

  // URL signée 7 jours
  const { data: signed } = await supabase.storage
    .from('boutique')
    .createSignedUrl('lurgence-des-temps.m4b', 60 * 60 * 24 * 7)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url: signed.signedUrl, chapters: CHAPTERS })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TIERS_WITH_EBOOK = ['ebook', 'dedicace', 'echange']

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const { data: contrib } = await supabase
    .from('crowdfunding_contributions')
    .select('id, email, tier_id, status')
    .eq('email', email.trim().toLowerCase())
    .eq('status', 'paid')
    .in('tier_id', TIERS_WITH_EBOOK)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!contrib) {
    // Réponse générique pour ne pas révéler si l'email est inconnu
    return NextResponse.json({ ok: true })
  }

  const { data: signedUrl } = await supabase.storage
    .from('boutique')
    .createSignedUrl('lurgence-des-temps.epub', 60 * 60 * 48)

  if (signedUrl?.signedUrl) {
    return NextResponse.json({ ok: true, url: signedUrl.signedUrl })
  }

  return NextResponse.json({ ok: true })
}

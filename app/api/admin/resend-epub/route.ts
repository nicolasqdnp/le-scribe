import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEpubEmail } from '../../../../lib/email'

const ADMIN_EMAIL = 'nicolas.salafranque@gmail.com'
const TIERS_WITH_EBOOK = ['ebook', 'dedicace', 'echange']

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { contribution_id } = await req.json()
  if (!contribution_id) return NextResponse.json({ error: 'contribution_id requis' }, { status: 400 })

  const { data: contrib, error } = await supabase
    .from('crowdfunding_contributions')
    .select('id, email, tier_id, status')
    .eq('id', contribution_id)
    .single()

  if (error || !contrib) return NextResponse.json({ error: 'Contribution introuvable' }, { status: 404 })
  if (contrib.status !== 'paid') return NextResponse.json({ error: 'Contribution non payée' }, { status: 400 })
  if (!TIERS_WITH_EBOOK.includes(contrib.tier_id)) return NextResponse.json({ error: 'Ce palier ne contient pas d\'ebook' }, { status: 400 })
  if (!contrib.email) return NextResponse.json({ error: 'Email manquant' }, { status: 400 })

  const { data: signedUrl } = await supabase.storage
    .from('boutique')
    .createSignedUrl('lurgence-des-temps.epub', 60 * 60 * 48)

  if (!signedUrl?.signedUrl) return NextResponse.json({ error: 'Impossible de générer l\'URL' }, { status: 500 })

  await sendEpubEmail(contrib.email, signedUrl.signedUrl)
  await supabase
    .from('crowdfunding_contributions')
    .update({ epub_sent_at: new Date().toISOString() })
    .eq('id', contrib.id)

  return NextResponse.json({ ok: true, email: contrib.email })
}

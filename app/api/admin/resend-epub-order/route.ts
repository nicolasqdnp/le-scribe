import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEpubEmail } from '../../../../lib/email'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { order_id } = await req.json()
  if (!order_id) return NextResponse.json({ error: 'order_id requis' }, { status: 400 })

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, email, product, status')
    .eq('id', order_id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (order.status !== 'paid') return NextResponse.json({ error: 'Commande non payée' }, { status: 400 })
  if (order.product !== 'epub') return NextResponse.json({ error: 'Ce produit ne contient pas d\'ebook' }, { status: 400 })
  if (!order.email) return NextResponse.json({ error: 'Email manquant' }, { status: 400 })

  const { data: signedUrl } = await supabase.storage
    .from('boutique')
    .createSignedUrl('lurgence-des-temps.epub', 60 * 60 * 48)

  if (!signedUrl?.signedUrl) return NextResponse.json({ error: 'Impossible de générer l\'URL' }, { status: 500 })

  await sendEpubEmail(order.email, signedUrl.signedUrl)
  await supabase
    .from('orders')
    .update({ epub_sent_at: new Date().toISOString() })
    .eq('id', order.id)

  return NextResponse.json({ ok: true, email: order.email })
}

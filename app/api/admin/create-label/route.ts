import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSendcloudParcel } from '../../../../lib/sendcloud'

export async function POST(req: NextRequest) {
  const { order_id } = await req.json()
  if (!order_id) return NextResponse.json({ error: 'order_id manquant' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, email, product, delivery, relay_point, shipping_name, shipping_address, shipping_phone')
    .eq('id', order_id)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  try {
    const result = await createSendcloudParcel(order)

    await supabase
      .from('orders')
      .update({
        shipped_at:      new Date().toISOString(),
        tracking_number: result.tracking_number,
        tracking_url:    result.tracking_url,
      })
      .eq('id', order_id)

    // Remplace l'URL Sendcloud (auth requise) par le proxy local
    const proxyLabelUrl = result.sendcloud_id
      ? `/api/admin/label?parcel_id=${result.sendcloud_id}`
      : null

    return NextResponse.json({ ...result, label_url: proxyLabelUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[create-label]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

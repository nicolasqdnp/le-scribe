import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Sendcloud vérifie le webhook avec un GET avant activation
export async function GET() {
  return NextResponse.json({ ok: true })
}

// Statuts Sendcloud considérés comme "expédié"
const SHIPPED_STATUS_IDS = [
  1000, // Ready to send (étiquette créée)
  1001, // Announced
  6,    // Sorted
  11,   // At sorting center
  12,   // At delivery
]

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Vérification signature Sendcloud (HMAC-SHA256)
  const secret = process.env.SENDCLOUD_WEBHOOK_SECRET
  if (secret) {
    const sig = req.headers.get('sendcloud-signature') || ''
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    if (sig !== expected) {
      console.error('[webhook/sendcloud] Signature invalide')
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const action = payload?.action
  const parcel = payload?.parcel

  console.log('[webhook/sendcloud]', action, parcel?.order_number, parcel?.status?.id)

  // On ne traite que les changements de statut avec un numéro de commande
  if (action !== 'parcel_status_changed' || !parcel?.order_number) {
    return NextResponse.json({ ok: true })
  }

  const statusId = parcel.status?.id
  if (!SHIPPED_STATUS_IDS.includes(statusId)) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Cherche la commande par order_number (= notre ID Supabase)
  const { error } = await supabase
    .from('orders')
    .update({
      shipped_at: new Date().toISOString(),
      tracking_number: parcel.tracking_number || null,
      tracking_url: parcel.tracking_url || null,
    })
    .eq('id', parcel.order_number)
    .is('shipped_at', null) // ne pas écraser si déjà marqué

  if (error) {
    console.error('[webhook/sendcloud] Erreur Supabase:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'nicolas.salafranque@egliselarencontre.fr'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('crowdfunding_contributions')
    .select('id, email, public_name, tier_id, amount, total_amount, shipping_name, shipping_address, shipped_at, created_at')
    .eq('status', 'paid')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, shipped } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const supabase = adminSupabase()
  const { error } = await supabase
    .from('crowdfunding_contributions')
    .update({ shipped_at: shipped ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

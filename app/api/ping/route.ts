import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // Requête légère pour maintenir le projet actif
    await supabase.from('projets_livres').select('id').limit(1)
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

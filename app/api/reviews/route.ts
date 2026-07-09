import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { data, error } = await supabase()
    .from('book_reviews')
    .select('id, name, rating, comment, created_at')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { name, rating, comment } = body ?? {}

  if (
    !name || typeof name !== 'string' ||
    !comment || typeof comment !== 'string' ||
    typeof rating !== 'number' || rating < 1 || rating > 5
  ) {
    return NextResponse.json({ error: 'Champs invalides' }, { status: 400 })
  }

  const { error } = await supabase().from('book_reviews').insert({
    name: name.trim().slice(0, 100),
    rating,
    comment: comment.trim().slice(0, 1000),
  })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

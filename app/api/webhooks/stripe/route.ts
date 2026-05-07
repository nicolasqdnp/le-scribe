import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Client admin (service role) pour bypasser les RLS dans le webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[webhook/stripe] Signature invalide:', message)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { user_id, plan } = session.metadata || {}

    if (user_id && plan) {
      const { error } = await supabaseAdmin
        .from('user_plans')
        .upsert({ user_id, plan, updated_at: new Date().toISOString() })

      if (error) {
        console.error('[webhook/stripe] Erreur mise à jour plan:', error.message)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      console.log(`[webhook/stripe] Plan mis à jour → user ${user_id} : ${plan}`)
    }
  }

  return NextResponse.json({ received: true })
}

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabase } from '../../../lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PLANS: Record<string, { name: string; description: string; amount: number; plan: string }> = {
  livre: {
    name: 'Le Scribe — Par livre',
    description: 'Chapitres illimités pour 1 livre · Export DOCX',
    amount: 5900, // centimes = 59€
    plan: 'livre',
  },
  forfait: {
    name: 'Le Scribe — Forfait 5 livres',
    description: '5 livres max · 3 mois · Support dédié',
    amount: 15900, // centimes = 159€
    plan: 'forfait',
  },
}

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json()
    if (!PLANS[plan]) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const planData = PLANS[plan]
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://lescribe.app'

    const session = await stripe.checkout.sessions.create({
      automatic_payment_methods: { enabled: true }, // active GPay, Apple Pay, carte…
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: planData.name,
            description: planData.description,
          },
          unit_amount: planData.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/dashboard?paiement=ok&plan=${plan}`,
      cancel_url:  `${origin}/dashboard`,
      metadata: {
        user_id: user.id,
        plan:    planData.plan,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

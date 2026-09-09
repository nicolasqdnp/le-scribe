import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    const { email, amount, name } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    const amtInt = parseInt(String(amount), 10)
    if (!amtInt || amtInt < 5) {
      return NextResponse.json({ error: 'Montant invalide (minimum 5 €)' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = req.headers.get('origin') || 'https://lescribe.app'

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: "Don — Ordination d'Audrey Salafranque",
              description: name?.trim()
                ? `Contribution de ${name.trim()}`
                : 'Enveloppe de soutien',
            },
            unit_amount: amtInt * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      success_url: `${origin}/ordination/merci?montant=${amtInt}`,
      cancel_url: `${origin}/ordination`,
      // Pas de payment_method_types → Stripe active automatiquement carte, Apple Pay, Google Pay, Link…
      metadata: {
        type: 'ordination',
        donateur: name?.trim() || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout-ordination]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

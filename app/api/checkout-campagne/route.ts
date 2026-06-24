import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const TIERS: Record<string, { ship: number; shipKind: string; physical: boolean; label: string }> = {
  merci:    { ship: 0,    shipKind: 'none',    physical: false, label: 'Un grand merci — L\'urgence des temps' },
  ebook:    { ship: 0,    shipKind: 'digital', physical: false, label: 'L\'urgence des temps — EPUB' },
  livre:    { ship: 300,  shipKind: 'fee',     physical: true,  label: 'L\'urgence des temps — Livre (tarif lancement)' },
  dedicace: { ship: 0,    shipKind: 'free',    physical: true,  label: 'L\'urgence des temps — Livre dédicacé' },
  echange:  { ship: 0,    shipKind: 'free',    physical: true,  label: 'L\'urgence des temps — Livre + échange' },
  pack3:    { ship: 500,  shipKind: 'fee',     physical: true,  label: 'L\'urgence des temps — Pack de 3' },
  eglise:   { ship: 1000, shipKind: 'fee',     physical: true,  label: 'L\'urgence des temps — Pack Église (10 ex.)' },
  don_libre:{ ship: 0,    shipKind: 'none',    physical: false, label: 'Don libre — L\'urgence des temps' },
}

export async function POST(req: NextRequest) {
  try {
    const { tier_id, email, amount } = await req.json()

    if (!tier_id || !TIERS[tier_id]) {
      return NextResponse.json({ error: 'Palier invalide' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    const amtInt = parseInt(String(amount), 10)
    if (!amtInt || amtInt <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    const tier = TIERS[tier_id]
    const amountCents = amtInt * 100
    const shippingCents = tier.ship
    const totalCents = amountCents + shippingCents

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: contribution, error: dbError } = await supabase
      .from('crowdfunding_contributions')
      .insert({
        email,
        tier_id,
        amount: amountCents,
        shipping_amount: shippingCents,
        total_amount: totalCents,
        status: 'pending',
      })
      .select('id')
      .single()

    if (dbError || !contribution) {
      console.error('[checkout-campagne] DB error:', dbError?.message)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = req.headers.get('origin') || 'https://lescribe.app'

    const lineItems = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: tier.label,
            description: 'Campagne de financement participatif — Éditions Le Scribe',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ]

    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: "Frais d'envoi",
            description: 'Livraison France, Belgique, Suisse, Luxembourg, Canada',
          },
          unit_amount: shippingCents,
        },
        quantity: 1,
      })
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      success_url: `${origin}/soutenir/merci?tier=${tier_id}`,
      cancel_url: `${origin}/soutenir`,
      metadata: {
        contribution_id: contribution.id,
        tier_id,
      },
      payment_method_types: ['card'],
    }

    if (tier.physical) {
      sessionParams.shipping_address_collection = {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'CA'],
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout-campagne]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

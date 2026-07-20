import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PRODUCTS = {
  epub: {
    name: 'L\'urgence des temps — EPUB',
    description: 'Livre numérique · Téléchargement immédiat après paiement',
    amount: 900,
    shipping: false,
    shippingAmount: 0,
    mrAmount: 0,
  },
  livre: {
    name: 'L\'urgence des temps — Livre physique',
    description: 'Éditions Le Scribe · 211 pages · Expédié sous 3–5 jours ouvrés',
    amount: 1899,
    shipping: true,
    shippingAmount: 300,
    mrAmount: 390,
  },
  pack3: {
    name: 'L\'urgence des temps — Pack 3 exemplaires',
    description: 'Éditions Le Scribe · 3 livres · 16 € / ex. · Expédié sous 3–5 jours ouvrés',
    amount: 4800,
    shipping: true,
    shippingAmount: 500,
    mrAmount: 550,
  },
  pack10: {
    name: 'L\'urgence des temps — Pack Église 10 exemplaires',
    description: 'Éditions Le Scribe · 10 livres · 14 € / ex. · Expédié sous 3–5 jours ouvrés',
    amount: 14000,
    shipping: true,
    shippingAmount: 500,
    mrAmount: 900,
  },
  physique: {
    name: 'L\'urgence des temps — Livre physique (précommande)',
    description: 'Éditions Le Scribe · Expédition dès impression disponible',
    amount: 1600,
    shipping: true,
    shippingAmount: 600,
    mrAmount: 390,
  },
}

export async function POST(req: NextRequest) {
  try {
    const { product, email, delivery = 'postal', relayPoint = null } = await req.json()

    if (!PRODUCTS[product as keyof typeof PRODUCTS]) {
      return NextResponse.json({ error: 'Produit invalide' }, { status: 400 })
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    if (delivery === 'relay' && !relayPoint) {
      return NextResponse.json({ error: 'Point relais non sélectionné' }, { status: 400 })
    }

    const p = PRODUCTS[product as keyof typeof PRODUCTS]
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = req.headers.get('origin') || 'https://lescribe.app'

    const isPickup = delivery === 'pickup'
    const isRelay = delivery === 'relay'
    const shippingCost = isPickup ? 0 : isRelay ? p.mrAmount : p.shippingAmount

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order } = await supabase
      .from('orders')
      .insert({
        email,
        product,
        amount: p.amount + shippingCost,
        status: 'pending',
        delivery,
        relay_point: relayPoint,
      })
      .select('id')
      .single()

    const lineItems: Array<{ price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }> = [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: p.name, description: p.description },
          unit_amount: p.amount,
        },
        quantity: 1,
      },
    ]

    if (!isPickup && shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: isRelay ? 'Livraison Mondial Relay' : 'Frais de port',
            description: isRelay
              ? `Point relais : ${relayPoint?.Nom || ''} — ${relayPoint?.CP || ''} ${relayPoint?.Ville || ''}`
              : 'Livraison France · Lettre suivie',
          },
          unit_amount: shippingCost,
        },
        quantity: 1,
      })
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      success_url: `${origin}/boutique/merci?product=${product}`,
      cancel_url: `${origin}/boutique`,
      metadata: {
        product,
        order_id: order?.id || '',
        delivery,
        relay_id: relayPoint?.ID || '',
      },
      payment_method_types: ['card'],
      phone_number_collection: { enabled: false },
    }

    // Adresse domicile uniquement pour livraison postale classique
    if (p.shipping && !isPickup && !isRelay) {
      sessionParams.shipping_address_collection = {
        allowed_countries: ['FR', 'BE', 'CH', 'LU', 'CA'],
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout-livre]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

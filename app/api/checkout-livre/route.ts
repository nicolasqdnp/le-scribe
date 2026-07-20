import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PRODUCTS = {
  epub: {
    name: 'L\'urgence des temps — EPUB',
    description: 'Livre numérique · Téléchargement immédiat après paiement',
    amount: 900,
    shipping: false,
  },
  livre: {
    name: 'L\'urgence des temps — Livre physique',
    description: 'Éditions Le Scribe · 211 pages · Expédié sous 3–5 jours ouvrés',
    amount: 1899,
    shipping: true,
    shippingAmount: 300,
  },
  physique: {
    name: 'L\'urgence des temps — Livre physique (précommande)',
    description: 'Éditions Le Scribe · Expédition dès impression disponible',
    amount: 1600,
    shipping: true,
    shippingAmount: 600,
  },
}

export async function POST(req: NextRequest) {
  try {
    const { product, email } = await req.json()

    if (!PRODUCTS[product as keyof typeof PRODUCTS]) {
      return NextResponse.json({ error: 'Produit invalide' }, { status: 400 })
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    const p = PRODUCTS[product as keyof typeof PRODUCTS]
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = req.headers.get('origin') || 'https://lescribe.app'

    // Créer un enregistrement order en attente
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: order } = await supabase
      .from('orders')
      .insert({ email, product, amount: p.amount + ('shippingAmount' in p ? p.shippingAmount : 0), status: 'pending' })
      .select('id')
      .single()

    const lineItems = [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: p.name, description: p.description },
          unit_amount: p.amount,
        },
        quantity: 1,
      },
    ]

    if ('shippingAmount' in p && p.shippingAmount) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Frais de port', description: 'Livraison France · Lettre suivie' },
          unit_amount: p.shippingAmount,
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
      },
      payment_method_types: ['card'],
      phone_number_collection: { enabled: false },
    }

    // Collecte adresse uniquement pour le livre physique
    if (p.shipping) {
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

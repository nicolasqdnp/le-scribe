import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  sendPaymentConfirmationEmail,
  sendEpubEmail,
  sendPhysiqueConfirmationEmail,
} from '../../../../lib/email'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
    const { user_id, plan, product, order_id } = session.metadata || {}

    // ── Achat SaaS (abonnement Le Scribe) ──────────────────────────────────────
    if (user_id && plan) {
      const { error } = await supabaseAdmin
        .from('user_plans')
        .upsert({ user_id, plan, updated_at: new Date().toISOString() })

      if (error) {
        console.error('[webhook/stripe] Erreur mise à jour plan:', error.message)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      console.log(`[webhook/stripe] Plan mis à jour → user ${user_id} : ${plan}`)

      const email = session.customer_email || ''
      if (email) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id)
        const prenom = userData?.user?.user_metadata?.nom?.split(' ')[0] || ''
        await sendPaymentConfirmationEmail(email, prenom, plan)
      }
    }

    // ── Achat boutique (livre) ──────────────────────────────────────────────────
    if (product && order_id) {
      const email = session.customer_email || ''

      // Marquer la commande comme payée + stocker adresse si physique
      const shippingAddress = session.shipping_details?.address || null
      const shippingName = session.shipping_details?.name || null

      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          stripe_session_id: session.id,
          shipping_name: shippingName,
          shipping_address: shippingAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      // Livraison EPUB : URL signée Supabase Storage (48h)
      if (product === 'epub' && email) {
        const { data: signedUrl } = await supabaseAdmin.storage
          .from('boutique')
          .createSignedUrl('lurgence-des-temps.epub', 60 * 60 * 48) // 48 heures

        if (signedUrl?.signedUrl) {
          await sendEpubEmail(email, signedUrl.signedUrl)
          await supabaseAdmin
            .from('orders')
            .update({ epub_sent_at: new Date().toISOString() })
            .eq('id', order_id)
        } else {
          console.error('[webhook/stripe] Impossible de générer l\'URL signée EPUB')
        }
      }

      // Confirmation précommande physique
      if (product === 'physique' && email) {
        await sendPhysiqueConfirmationEmail(email, shippingName || '')
      }

      console.log(`[webhook/stripe] Commande ${product} confirmée → ${email}`)
    }
  }

  return NextResponse.json({ received: true })
}

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  sendPaymentConfirmationEmail,
  sendEpubEmail,
  sendPhysiqueConfirmationEmail,
  sendCampaignConfirmationEmail,
  sendLivreConfirmationEmail,
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
    if (product) {
      const email = session.customer_email || ''
      const shipping = (session as any).shipping_details || (session as any).shipping
      const customerDetails = (session as any).customer_details
      const shippingAddress = shipping?.address || null
      const billingAddress = customerDetails?.address || null
      const shippingName = shipping?.name || customerDetails?.name || null
      const shippingPhone = customerDetails?.phone || null

      if (order_id) {
        // Cas normal : commande créée au moment du checkout
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            shipping_name: shippingName,
            shipping_address: shippingAddress || billingAddress,
            shipping_phone: shippingPhone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order_id)
      } else {
        // Cas de fallback : l'insert Supabase a échoué au checkout (order_id vide)
        console.warn('[webhook/stripe] order_id vide pour session', session.id, '— création fallback')
        const delivery = session.metadata?.delivery || 'postal'
        const relayId = session.metadata?.relay_id || null
        const { error: insertErr } = await supabaseAdmin
          .from('orders')
          .insert({
            email,
            product,
            amount: session.amount_total || 0,
            status: 'paid',
            stripe_session_id: session.id,
            delivery,
            relay_point: relayId ? { code: relayId } : null,
            shipping_name: shippingName,
            shipping_address: shippingAddress || billingAddress,
            shipping_phone: shippingPhone,
          })
        if (insertErr) console.error('[webhook/stripe] Fallback insert error:', insertErr.message)
      }

      // Livraison EPUB : URL signée Supabase Storage (48h)
      if (product === 'epub' && email) {
        const { data: signedUrl } = await supabaseAdmin.storage
          .from('boutique')
          .createSignedUrl('lurgence-des-temps.epub', 60 * 60 * 48)

        if (signedUrl?.signedUrl) {
          await sendEpubEmail(email, signedUrl.signedUrl)
          if (order_id) {
            await supabaseAdmin
              .from('orders')
              .update({ epub_sent_at: new Date().toISOString() })
              .eq('id', order_id)
          }
        } else {
          console.error('[webhook/stripe] Impossible de générer l\'URL signée EPUB')
        }
      }

      // Confirmation précommande physique (ancien produit)
      if (product === 'physique' && email) {
        await sendPhysiqueConfirmationEmail(email, shippingName || '')
      }

      // Confirmation commande boutique physique (livre/pack3/pack10)
      if (['livre', 'pack3', 'pack10'].includes(product) && email) {
        await sendLivreConfirmationEmail(email, product, shippingName)
      }

      console.log(`[webhook/stripe] Commande ${product} confirmée → ${email}`)
    }

    // ── Contribution crowdfunding ───────────────────────────────────────────────
    if (session.metadata?.contribution_id) {
      const { contribution_id, tier_id } = session.metadata
      const email = session.customer_email || ''
      const shipping = (session as any).shipping_details || (session as any).shipping

      await supabaseAdmin
        .from('crowdfunding_contributions')
        .update({
          status: 'paid',
          stripe_session_id: session.id,
          shipping_name: shipping?.name || null,
          shipping_address: shipping?.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contribution_id)

      const TIERS_WITH_EBOOK = ['ebook', 'dedicace', 'echange']
      if (TIERS_WITH_EBOOK.includes(tier_id) && email) {
        const { data: existing } = await supabaseAdmin
          .from('crowdfunding_contributions')
          .select('epub_sent_at')
          .eq('id', contribution_id)
          .single()
        if (!existing?.epub_sent_at) {
          const { data: signedUrl } = await supabaseAdmin.storage
            .from('boutique')
            .createSignedUrl('lurgence-des-temps.epub', 60 * 60 * 48)
          if (signedUrl?.signedUrl) {
            await sendEpubEmail(email, signedUrl.signedUrl)
            await supabaseAdmin.from('crowdfunding_contributions')
              .update({ epub_sent_at: new Date().toISOString() })
              .eq('id', contribution_id)
          }
        }
      }
      if (tier_id !== 'ebook' && email) {
        await sendCampaignConfirmationEmail(email, tier_id)
      }
      console.log(`[webhook/stripe] Contribution ${tier_id} confirmée → ${email}`)
    }
  }

  return NextResponse.json({ received: true })
}

const BASE = 'https://panel.sendcloud.sc/api/v2'

function auth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY!
  const sec = process.env.SENDCLOUD_SECRET_KEY!
  return 'Basic ' + Buffer.from(`${pub}:${sec}`).toString('base64')
}

// IDs méthodes d'expédition Sendcloud — confirmés le 2026-07-22
const RELAY_METHOD: Record<string, number> = {
  livre:  28036, // Mondial Relay Point Relais 0.25-0.5kg
  pack3:  28037, // Mondial Relay Point Relais 0.5-1kg
  pack10: 28040, // Mondial Relay Point Relais 3-5kg
}
const HOME_METHOD: Record<string, number> = {
  livre:  27756, // Mondial Relay Home Domestic 0.25-0.5kg
  pack3:  27757, // Mondial Relay Home Domestic 0.5-1kg
  pack10: 27760, // Mondial Relay Home Domestic 3-5kg
}
const WEIGHT: Record<string, string> = {
  livre:  '0.320',
  pack3:  '0.960',
  pack10: '3.200',
}

export type SendcloudOrder = {
  id: string
  email: string
  product: string
  delivery: string
  relay_point?: { code: string; name: string; address: string; city: string; zipCode: string } | null
  shipping_name?: string | null
  shipping_address?: { line1?: string; line2?: string; postal_code?: string; city?: string; country?: string } | null
  shipping_phone?: string | null
}

export async function createSendcloudParcel(order: SendcloudOrder) {
  const isRelay  = order.delivery === 'relay'
  const isHome   = order.delivery === 'home-mr'

  const methodId = isRelay
    ? RELAY_METHOD[order.product]
    : HOME_METHOD[order.product]

  if (!methodId) throw new Error(`Aucune méthode Sendcloud pour ${order.product}/${order.delivery}`)

  const weight = WEIGHT[order.product] ?? '0.500'

  let parcelBody: Record<string, unknown>

  if (isRelay && order.relay_point) {
    const rp = order.relay_point
    // Cherche le service point Sendcloud correspondant au code MR
    const spRes = await fetch(
      `${BASE}/service-points/?carrier=mondial_relay&country=FR&postal_code=${rp.zipCode}`,
      { headers: { Authorization: auth() } }
    )
    const spData = await spRes.json()
    const servicePoint = (spData as any[]).find(
      (sp: any) => sp.code === rp.code || sp.name?.toLowerCase().includes(rp.name?.toLowerCase().slice(0, 8))
    )

    parcelBody = {
      name:             order.shipping_name || order.email.split('@')[0],
      address:          rp.address,
      postal_code:      rp.zipCode,
      city:             rp.city,
      country:          { iso_2: 'FR' },
      email:            order.email,
      weight,
      shipment:         { id: methodId },
      order_number:     order.id,
      request_label:    true,
      ...(servicePoint ? { to_service_point: servicePoint.id } : {}),
    }
  } else if (isHome && order.shipping_address) {
    const addr = order.shipping_address
    parcelBody = {
      name:          order.shipping_name || order.email.split('@')[0],
      address:       [addr.line1, addr.line2].filter(Boolean).join(' '),
      postal_code:   addr.postal_code ?? '',
      city:          addr.city ?? '',
      country:       { iso_2: (addr.country ?? 'FR').toUpperCase() },
      email:         order.email,
      telephone:     order.shipping_phone ?? '',
      weight,
      shipment:      { id: methodId },
      order_number:  order.id,
      request_label: true,
    }
  } else {
    throw new Error('Données de livraison insuffisantes pour créer une étiquette')
  }

  const res = await fetch(`${BASE}/parcels`, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ parcel: parcelBody }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))

  const parcel = data.parcel
  return {
    sendcloud_id:   parcel.id,
    tracking_number: parcel.tracking_number,
    tracking_url:   parcel.tracking_url,
    label_url:      parcel.label?.label_printer ?? parcel.label?.normal_printer ?? null,
  }
}

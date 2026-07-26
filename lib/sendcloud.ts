const BASE_V3 = 'https://panel.sendcloud.sc/api/v3'
const SENDER_ADDRESS_ID = 848446

// Shipping option codes Mondial Relay — confirmés le 2026-07-26
const RELAY_OPTION_CODE  = 'mondial_relay:service_point,dualapi/size=l,c2c'
const HOME_MR_OPTION_CODE = 'mondial_relay:home_domestic,dualapi/c2c'

const WEIGHT_KG: Record<string, number> = {
  livre:  0.320,
  pack3:  0.960,
  pack10: 3.200,
}

function auth() {
  const pub = process.env.SENDCLOUD_PUBLIC_KEY!
  const sec = process.env.SENDCLOUD_SECRET_KEY!
  return 'Basic ' + Buffer.from(`${pub}:${sec}`).toString('base64')
}

// MR widget code "008951" → Sendcloud carrier_service_point_id "FR08951"
function mrCodeToCsid(mrCode: string): string {
  return 'FR' + String(parseInt(mrCode, 10)).padStart(5, '0')
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
  const isRelay = order.delivery === 'relay'
  const isHome  = order.delivery === 'home-mr'

  const weightKg = WEIGHT_KG[order.product] ?? 0.500
  const name  = order.shipping_name || order.email.split('@')[0]
  const phone = order.shipping_phone ?? ''

  let body: Record<string, unknown>

  if (isRelay && order.relay_point) {
    const rp = order.relay_point
    body = {
      to_address: {
        name,
        address_line_1: rp.address || '',
        house_number:   '',
        postal_code:    rp.zipCode || '',
        city:           rp.city || '',
        country_code:   'FR',
        email:          order.email,
        phone,
      },
      to_service_point: { carrier_service_point_id: mrCodeToCsid(rp.code) },
      from_address: { sender_address_id: SENDER_ADDRESS_ID },
      ship_with: {
        type:       'shipping_option_code',
        properties: { shipping_option_code: RELAY_OPTION_CODE },
      },
      parcels:       [{ weight: { value: weightKg, unit: 'kg' } }],
      order_number:  order.id,
      request_label: true,
    }
  } else if (isHome && order.shipping_address) {
    const addr = order.shipping_address
    const line = [addr.line1, addr.line2].filter(Boolean).join(' ')
    body = {
      to_address: {
        name,
        address_line_1: line || '',
        house_number:   '',
        postal_code:    addr.postal_code ?? '',
        city:           addr.city ?? '',
        country_code:   (addr.country ?? 'FR').toUpperCase(),
        email:          order.email,
        phone,
      },
      from_address: { sender_address_id: SENDER_ADDRESS_ID },
      ship_with: {
        type:       'shipping_option_code',
        properties: { shipping_option_code: HOME_MR_OPTION_CODE },
      },
      parcels:       [{ weight: { value: weightKg, unit: 'kg' } }],
      order_number:  order.id,
      request_label: true,
    }
  } else {
    throw new Error('Données de livraison insuffisantes pour créer une étiquette')
  }

  const res = await fetch(`${BASE_V3}/shipments`, {
    method:  'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))

  const shipment = data.data
  const parcel   = shipment?.parcels?.[0]

  const labelDoc = parcel?.documents?.find(
    (d: any) => d.type === 'label' || String(d.type ?? '').includes('label')
  )

  return {
    sendcloud_id:    parcel?.id ?? null,
    tracking_number: parcel?.tracking_number ?? '',
    tracking_url:    parcel?.tracking_url ?? null,
    label_url:       labelDoc?.url ?? null,
  }
}

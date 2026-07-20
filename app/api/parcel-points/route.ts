import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const zipCode = req.nextUrl.searchParams.get('zipCode')
  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return NextResponse.json({ error: 'Code postal invalide' }, { status: 400 })
  }

  const auth = Buffer.from(
    `${process.env.BOXTAL_ACCESS_KEY}:${process.env.BOXTAL_SECRET_KEY}`
  ).toString('base64')

  const url = `https://api.boxtal.com/v2/parcel-point?country=FR&zipCode=${zipCode}&networks[]=MONR_NETWORK`

  try {
    const res = await fetch(url, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) return NextResponse.json({ error: 'Erreur Boxtal' }, { status: 502 })

    const data = await res.json()

    const points = (data.nearbyParcelPoints ?? []).slice(0, 12).map((item: any) => ({
      code: item.parcelPoint.code,
      name: item.parcelPoint.name,
      address: item.parcelPoint.location.street,
      city: item.parcelPoint.location.city,
      zipCode: item.parcelPoint.location.zipCode,
      distance: Math.round(item.distanceFromSearchLocation),
      openingDays: item.parcelPoint.openingDays,
    }))

    return NextResponse.json(points)
  } catch (err) {
    return NextResponse.json({ error: 'Erreur réseau' }, { status: 500 })
  }
}

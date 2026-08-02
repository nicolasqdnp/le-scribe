import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const parcelId = req.nextUrl.searchParams.get('parcel_id')
  if (!parcelId) return NextResponse.json({ error: 'parcel_id manquant' }, { status: 400 })

  const pub = process.env.SENDCLOUD_PUBLIC_KEY!
  const sec = process.env.SENDCLOUD_SECRET_KEY!
  const authHeader = 'Basic ' + Buffer.from(`${pub}:${sec}`).toString('base64')

  const res = await fetch(
    `https://panel.sendcloud.sc/api/v3/parcels/${parcelId}/documents/label`,
    { headers: { Authorization: authHeader } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Label introuvable' }, { status: res.status })
  }

  const pdf = await res.arrayBuffer()
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="etiquette-${parcelId}.pdf"`,
    },
  })
}

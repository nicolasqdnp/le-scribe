import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('crowdfunding_contributions')
      .select('amount, tier_id, public_name')
      .eq('status', 'paid')

    if (error) {
      console.error('[campagne/stats]', error.message)
      return NextResponse.json({ raised: 0, backers: 0, tierBackers: {} })
    }

    const backers = data?.length ?? 0
    const raised = data?.reduce((sum, row) => sum + row.amount, 0) ?? 0

    const tierBackers: Record<string, number> = {}
    data?.forEach(row => {
      tierBackers[row.tier_id] = (tierBackers[row.tier_id] ?? 0) + 1
    })

    const BLACKLIST = ['pas besoin', 'pas de dédicace', 'sans dédicace', 'livre 1', 'livre 2', 'livre 3']
    const supporters = (data ?? [])
      .map(row => row.public_name)
      .filter((n): n is string => {
        if (!n || n.trim().length < 3) return false
        const lower = n.toLowerCase()
        return !BLACKLIST.some(b => lower.includes(b))
      })

    return NextResponse.json({ raised: Math.round(raised / 100), backers, tierBackers, supporters })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[campagne/stats]', message)
    return NextResponse.json({ raised: 0, backers: 0 })
  }
}

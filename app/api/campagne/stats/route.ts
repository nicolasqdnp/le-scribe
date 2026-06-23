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
      .select('amount')
      .eq('status', 'paid')

    if (error) {
      console.error('[campagne/stats]', error.message)
      return NextResponse.json({ raised: 0, backers: 0 })
    }

    const backers = data?.length ?? 0
    const raised = data?.reduce((sum, row) => sum + row.amount, 0) ?? 0

    // amount est stocké en centimes, on retourne en euros
    return NextResponse.json({ raised: Math.round(raised / 100), backers })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[campagne/stats]', message)
    return NextResponse.json({ raised: 0, backers: 0 })
  }
}

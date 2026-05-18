import { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const LIMITS: Record<string, { max: number; windowMinutes: number }> = {
  'generate-chapter':        { max: 20, windowMinutes: 60 },
  'improve-chapter':         { max: 20, windowMinutes: 60 },
  'chat-project':            { max: 30, windowMinutes: 60 },
  'analyze-profile':         { max: 5,  windowMinutes: 60 },
  'analyze-sources':         { max: 10, windowMinutes: 60 },
  'generate-cover':          { max: 5,  windowMinutes: 60 },
  'generate-extras':         { max: 5,  windowMinutes: 60 },
  'fetch-transcript':        { max: 30, windowMinutes: 60 },
  'fetch-profile-transcripts': { max: 10, windowMinutes: 60 },
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<NextResponse | null> {
  const config = LIMITS[endpoint]
  if (!config) return null

  const since = new Date(Date.now() - config.windowMinutes * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('rate_limit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', since)

  if (error) {
    console.error('[rate-limit] select error:', error.message)
    return null
  }

  if ((count ?? 0) >= config.max) {
    console.error(`[rate-limit] ${endpoint} limit reached for user ${userId}: ${count}/${config.max}`)
    return NextResponse.json(
      { error: `Limite atteinte : max ${config.max} requêtes par heure. Réessaie plus tard.` },
      { status: 429 }
    )
  }

  await supabase.from('rate_limit_logs').insert({ user_id: userId, endpoint })
  return null
}

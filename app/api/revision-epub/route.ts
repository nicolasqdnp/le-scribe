import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Route publique — génère une URL signée fraîche (48h) pour l'EPUB révisé
// Utilisée par la page /revision (papillon dans les livres physiques)
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.storage
    .from('boutique')
    .createSignedUrl('lurgence-des-temps.epub', 60 * 60 * 48)

  if (error || !data?.signedUrl) {
    console.error('[revision-epub] Erreur génération URL signée:', error?.message)
    return NextResponse.json({ error: 'Lien indisponible' }, { status: 500 })
  }

  // Redirige directement vers le fichier → téléchargement immédiat au clic
  return NextResponse.redirect(data.signedUrl)
}

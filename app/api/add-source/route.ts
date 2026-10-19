import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const form = await req.formData()
    const projetId = form.get('projetId') as string
    const file = form.get('file') as File | null

    if (!projetId || !file) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

    const { data: projet } = await supabase
      .from('projets_livres')
      .select('id')
      .eq('id', projetId)
      .eq('user_id', user.id)
      .single()
    if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const fileName = file.name.toLowerCase()
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let contenuBrut = ''

    if (fileName.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(fileBuffer)
      contenuBrut = data.text
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ buffer: fileBuffer })
      contenuBrut = result.value
    } else {
      return NextResponse.json({ error: 'Format non supporté (PDF ou DOCX uniquement)' }, { status: 400 })
    }

    if (!contenuBrut.trim()) {
      return NextResponse.json({ error: "Impossible d'extraire le texte de ce fichier" }, { status: 400 })
    }

    const { data: source } = await supabase
      .from('sources')
      .insert({
        user_id: user.id,
        projet_id: projetId,
        type: 'document',
        usage: 'book_source',
        label: file.name,
        contenu_brut: contenuBrut,
      })
      .select('id, label')
      .single()

    return NextResponse.json({ ok: true, sourceId: source?.id, label: source?.label })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[add-source]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

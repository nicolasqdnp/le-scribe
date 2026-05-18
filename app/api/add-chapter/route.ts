import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'

async function extractDrive(url: string): Promise<string> {
  // Google Docs → export as plain text
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([^/]+)/)
  if (docMatch) {
    const exportUrl = `https://docs.google.com/document/d/${docMatch[1]}/export?format=txt`
    const res = await fetch(exportUrl)
    if (!res.ok) throw new Error('Impossible de télécharger le document Google Docs')
    return await res.text()
  }
  // Lien Drive direct (fichier public)
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (driveMatch) {
    const exportUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`
    const res = await fetch(exportUrl)
    if (!res.ok) throw new Error("Impossible de télécharger le fichier Drive (vérifier qu'il est public)")
    return await res.text()
  }
  // URL quelconque → tentative fetch texte brut
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Impossible de récupérer l'URL (${res.status})`)
  return await res.text()
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    let projetId: string, titre: string, sourceType: string
    let sourceUrl = '', sourceText = '', fileBuffer: Buffer | null = null, fileName = ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      projetId = form.get('projetId') as string
      titre = form.get('titre') as string
      sourceType = form.get('sourceType') as string
      const file = form.get('file') as File | null
      if (file) {
        fileBuffer = Buffer.from(await file.arrayBuffer())
        fileName = file.name.toLowerCase()
      }
    } else {
      const body = await req.json()
      projetId = body.projetId
      titre = body.titre
      sourceType = body.sourceType
      sourceUrl = body.sourceUrl || ''
      sourceText = body.sourceText || ''
    }

    if (!projetId || !titre) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

    const { data: projet } = await supabase
      .from('projets_livres')
      .select('*')
      .eq('id', projetId)
      .eq('user_id', user.id)
      .single()
    if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { data: chapitresExistants } = await supabase
      .from('chapitres')
      .select('numero')
      .eq('projet_id', projetId)
      .order('numero', { ascending: true })

    const numeros = (chapitresExistants || []).map(c => c.numero).filter(n => n !== 999)
    const maxNum = numeros.length > 0 ? Math.max(...numeros) : 0
    const newNumero = maxNum + 1

    // Extraire le contenu de la source
    let contenuBrut = ''
    let needsTranscription = false

    if (sourceType === 'youtube') {
      needsTranscription = true
    } else if (sourceType === 'note') {
      contenuBrut = sourceText
    } else if (sourceType === 'drive') {
      contenuBrut = await extractDrive(sourceUrl)
    } else if (sourceType === 'pdf' && fileBuffer) {
      // Import dynamique pour éviter les problèmes de Next.js
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(fileBuffer)
      contenuBrut = data.text
    } else if (sourceType === 'docx' && fileBuffer) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ buffer: fileBuffer })
      contenuBrut = result.value
    }

    // Créer la source dans la table sources
    let sourceId: string | null = null
    if (sourceType !== 'none') {
      const sourceRecord: Record<string, unknown> = {
        user_id: user.id,
        projet_id: projetId,
        type: sourceType === 'note' ? 'note' : sourceType === 'youtube' ? 'youtube' : 'document',
        usage: 'book_source',
        ordre: newNumero,
      }
      if (sourceType === 'youtube') sourceRecord.url = sourceUrl
      if (contenuBrut) sourceRecord.contenu_brut = contenuBrut
      if (fileName) sourceRecord.titre = fileName

      const { data: src } = await supabase.from('sources').insert(sourceRecord).select('id').single()
      sourceId = src?.id || null
    }

    // Créer le chapitre
    const { data: newChapitre } = await supabase
      .from('chapitres')
      .insert({
        user_id: user.id,
        projet_id: projetId,
        numero: newNumero,
        titre,
        statut: 'vide',
      })
      .select()
      .single()

    if (!newChapitre) return NextResponse.json({ error: 'Erreur création chapitre' }, { status: 500 })

    // Mettre à jour plan_ia avec le nouveau chapitre
    const planIa = (projet.plan_ia || {}) as Record<string, unknown>
    const chapitresPlan = (planIa.chapitres as Array<Record<string, unknown>>) || []
    const newChapPlan: Record<string, unknown> = {
      numero: newNumero,
      titre,
      message_central: '',
      points_cles: [],
      versets_suggeres: [],
      resume: '',
    }
    if (contenuBrut) newChapPlan.source_brut = contenuBrut.slice(0, 8000)

    // Insérer avant la conclusion si elle existe
    const conclusionIdx = chapitresPlan.findIndex(c => c.numero === 999)
    if (conclusionIdx >= 0) {
      chapitresPlan.splice(conclusionIdx, 0, newChapPlan)
    } else {
      chapitresPlan.push(newChapPlan)
    }

    await supabase
      .from('projets_livres')
      .update({ plan_ia: { ...planIa, chapitres: chapitresPlan } })
      .eq('id', projetId)

    return NextResponse.json({
      ok: true,
      chapitre: newChapitre,
      sourceId,
      needsTranscription,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[add-chapter]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

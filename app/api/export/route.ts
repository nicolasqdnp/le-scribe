import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '../../../lib/supabase-server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageBreak, Footer, PageNumber,
  convertInchesToTwip, SectionType,
} from 'docx'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HTMLtoDOCX = require('html-to-docx')

const SECTION_LABELS: Record<string, string> = {
  '-1': 'Préface',
  '0': 'Introduction',
  '998': 'Remerciements',
  '999': 'Conclusion',
}

function numeroLabel(numero: number): string {
  return SECTION_LABELS[String(numero)] || `Chapitre ${numero}`
}

function buildParagraphs(text: string): Paragraph[] {
  if (!text?.trim()) return []
  const blocks = text.split(/\n{2,}/)
  const result: Paragraph[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.trim())
    if (!lines.length) continue
    result.push(
      new Paragraph({
        children: lines.flatMap((line, i) => {
          const runs: TextRun[] = []
          if (i > 0) runs.push(new TextRun({ break: 1, text: '' }))
          runs.push(new TextRun({ text: line, font: 'Georgia', size: 24 }))
          return runs
        }),
        spacing: { after: 160, line: 360 },
        indent: { firstLine: convertInchesToTwip(0.3) },
      })
    )
  }
  return result
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projetId = searchParams.get('projetId')
    if (!projetId) return NextResponse.json({ error: 'projetId manquant' }, { status: 400 })

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: projet } = await supabase
      .from('projets_livres').select('*').eq('id', projetId).eq('user_id', user.id).single()
    if (!projet) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const { data: chapitres } = await supabase
      .from('chapitres').select('numero, titre, contenu_final').eq('projet_id', projetId).order('numero', { ascending: true })

    const titre = (projet.plan_ia?.titre_final || projet.titre || 'Mon livre') as string
    const auteur = (user.user_metadata?.nom || user.email?.split('@')[0] || 'Auteur') as string

    // Marges KDP standard : intérieur 0.75", extérieur/haut/bas 0.5"
    const margin = {
      top: convertInchesToTwip(0.75),
      bottom: convertInchesToTwip(0.75),
      left: convertInchesToTwip(0.875),
      right: convertInchesToTwip(0.625),
    }

    // Footer avec numéro de page centré
    const footer = new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ children: [PageNumber.CURRENT], font: 'Georgia', size: 20, color: '888888' }),
          ],
        }),
      ],
    })

    // --- Page de titre (section sans footer) ---
    const pageTitre: Paragraph[] = [
      new Paragraph({ children: [], spacing: { before: convertInchesToTwip(2) } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: titre, bold: true, size: 52, font: 'Georgia' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: auteur, size: 28, font: 'Georgia', color: '555555' })],
      }),
    ]

    // --- Contenu ---
    const contenuChildren: Paragraph[] = []

    for (const ch of chapitres || []) {
      const contenu = ch.contenu_final || ''
      if (!contenu.trim()) continue

      const isRegular = ch.numero > 0 && ch.numero < 998
      const label = numeroLabel(ch.numero)
      const titreAffiche = isRegular ? `${label}` : (ch.titre || label)
      const sousTitre = isRegular && ch.titre ? ch.titre : null

      // Saut de page + titre chapitre
      contenuChildren.push(
        new Paragraph({
          pageBreakBefore: true,
          spacing: { before: convertInchesToTwip(1.5), after: 120 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: titreAffiche, font: 'Georgia', size: 28, color: '888888', allCaps: true })],
        })
      )
      if (sousTitre) {
        contenuChildren.push(
          new Paragraph({
            spacing: { before: 120, after: 480 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: sousTitre, font: 'Georgia', size: 36, bold: true })],
          })
        )
      } else {
        contenuChildren.push(new Paragraph({ children: [], spacing: { after: 480 } }))
      }

      contenuChildren.push(...buildParagraphs(contenu))
    }

    const doc = new Document({
      creator: auteur,
      title: titre,
      sections: [
        // Section 1 : page de titre, pas de footer
        {
          properties: {
            type: SectionType.NEXT_PAGE,
            page: { margin },
          },
          children: pageTitre,
        },
        // Section 2 : contenu avec footer numéroté
        {
          properties: {
            type: SectionType.NEXT_PAGE,
            page: { margin },
          },
          footers: { default: footer },
          children: contenuChildren,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    const safeTitre = titre.replace(/[^a-zA-Z0-9À-ɏ\s-]/g, '').trim().replace(/\s+/g, '_')
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeTitre}.docx"`,
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[export GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST : export depuis l'éditeur TipTap (HTML formaté)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { projetId, html, titre: titreParam } = await req.json()
    if (!html) return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 })

    const titre = (titreParam || 'Mon livre') as string
    const auteur = (user.user_metadata?.nom || user.email?.split('@')[0] || 'Auteur') as string

    const htmlComplet = `
      <!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>
        body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.8; }
        h1 { font-size: 22pt; font-weight: bold; page-break-before: always; margin-top: 2em; }
        h2 { font-size: 16pt; font-weight: bold; margin-top: 1em; }
        h3 { font-size: 13pt; font-weight: bold; }
        p { margin: 0 0 0.5em; text-indent: 1.2em; }
      </style></head>
      <body>${html}</body></html>`

    const buffer = await HTMLtoDOCX(htmlComplet, null, {
      title: titre,
      creator: auteur,
      font: 'Georgia',
      fontSize: 24,
      margins: { top: 1080, bottom: 1080, left: 1260, right: 900 },
      pageNumber: true,
      footer: true,
    })

    const safeTitre = titre.replace(/[^a-zA-Z0-9À-ɏ\s-]/g, '').trim().replace(/\s+/g, '_')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeTitre}.docx"`,
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[export POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, FontFamily, FontSize, Color } from '@tiptap/extension-text-style'

// Extension d'indentation pour paragraphes et listes
const IndentExtension = Extension.create({
  name: 'indent',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        indent: {
          default: 0,
          renderHTML: attrs => attrs.indent > 0 ? { style: `margin-left: ${attrs.indent * 2}em` } : {},
          parseHTML: el => Math.round(parseFloat(el.style.marginLeft || '0') / 2) || 0,
        }
      }
    }]
  },
  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        if (this.editor.isActive('listItem'))
          return this.editor.commands.sinkListItem('listItem')
        const { indent = 0 } = this.editor.getAttributes('paragraph')
        return this.editor.commands.updateAttributes('paragraph', { indent: Math.min(indent + 1, 8) })
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('listItem'))
          return this.editor.commands.liftListItem('listItem')
        const { indent = 0 } = this.editor.getAttributes('paragraph')
        if (indent > 0) return this.editor.commands.updateAttributes('paragraph', { indent: indent - 1 })
        return false
      },
    }
  },
})

const SECTION_LABELS = { '-1': 'Préface', '0': 'Introduction', '998': 'Remerciements', '999': 'Conclusion' }
function chLabel(ch) {
  return SECTION_LABELS[String(ch.numero)] || `Chapitre ${ch.numero}`
}

function chapitresVersHTML(chapitres) {
  return chapitres.map(ch => {
    const contenu = ch.contenu_final || ''
    if (!contenu.trim()) return ''
    const isRegular = ch.numero > 0 && ch.numero < 998
    const titreSection = isRegular ? chLabel(ch) : (ch.titre || chLabel(ch))
    const sousTitre = isRegular && ch.titre ? `<h2>${ch.titre}</h2>` : ''
    const lineToHtml = line => {
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
      return `<p>${line}</p>`
    }
    const body = contenu.split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(b => {
      if (b.startsWith('### ')) return `<h3>${b.slice(4)}</h3>`
      if (b.startsWith('## ')) return `<h2>${b.slice(3)}</h2>`
      if (b.includes('\n')) {
        const lines = b.split('\n').map(l => l.trim()).filter(Boolean)
        const hasStructure = lines.some(l => l.startsWith('##') || l.startsWith('•') || l.startsWith('—') || l.startsWith('- ') || l.startsWith('* ') || /^\d+[.)]\s/.test(l))
        if (hasStructure) return lines.map(lineToHtml).join('')
      }
      return `<p>${b.replace(/\n/g, '<br/>')}</p>`
    }).join('')
    return `<h1>${titreSection}</h1>${sousTitre}${body}`
  }).join('')
}

const FONTS = ['Georgia', 'Times New Roman', 'Garamond', 'Palatino', 'Arial', 'Helvetica']
const SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24]

function ToolbarButton({ onClick, active, title, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 rounded text-sm transition ${active ? 'bg-gold/20 text-gold' : 'hover:bg-stone-200 text-stone-600'} disabled:opacity-30`}>
      {children}
    </button>
  )
}

const SUGGESTIONS = [
  "Comment structurer une introduction de chapitre ?",
  "Comment mettre en valeur une citation biblique ?",
  "Quelle longueur idéale pour un chapitre pastoral ?",
  "Quand utiliser des sous-titres dans un chapitre ?",
  "Comment paginer préface, intro et conclusion ?",
]

export default function EditionPage() {
  const { id } = useParams()
  const [titre, setTitre] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [font, setFont] = useState('Georgia')
  const [fontSize, setFontSize] = useState('12')
  const [currentType, setCurrentType] = useState('p')
  const containerRef = useRef(null)

  // Panneau conseils mise en page
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      IndentExtension,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-full',
        style: 'font-family: Georgia, serif; font-size: 12pt; line-height: 1.8;',
      },
    },
  })

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const authTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 8000))
        const { data: { user } } = await Promise.race([supabase.auth.getUser(), authTimeout])
        if (!user) return

        const [{ data: projet }, { data: chapitres }] = await Promise.all([
          supabase.from('projets_livres').select('titre, plan_ia').eq('id', id).eq('user_id', user.id).single(),
          supabase.from('chapitres').select('numero, titre, contenu_final').eq('projet_id', id).order('numero', { ascending: true }),
        ])
        const { data: edition } = await supabase.from('projets_livres').select('contenu_edition').eq('id', id).single()

        if (projet) {
          setTitre(projet.plan_ia?.titre_final || projet.titre || 'Mon livre')
          const html = edition?.contenu_edition || chapitresVersHTML(chapitres || [])
          editor.commands.setContent(html || '<p>Aucun contenu trouvé.</p>')
        }
      } catch (e) {
        console.error('Erreur chargement édition:', e)
      } finally {
        setLoading(false)
      }
    }
    if (editor) init()
  }, [editor, id])

  const save = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('projets_livres').update({ contenu_edition: editor.getHTML(), updated_at: new Date().toISOString() }).eq('id', id)
    } catch { /* colonne pas encore créée, on ignore */ }
    setSaving(false)
  }, [editor, id])

  // Synchronise le type avec l'état réel
  useEffect(() => {
    if (!editor) return
    const update = () => {
      const t = editor.isActive('heading', { level: 1 }) ? '1' :
        editor.isActive('heading', { level: 2 }) ? '2' :
        editor.isActive('heading', { level: 3 }) ? '3' :
        editor.isActive('bulletList') ? 'ul' :
        editor.isActive('orderedList') ? 'ol' : 'p'
      setCurrentType(t)
    }
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => { editor.off('selectionUpdate', update); editor.off('transaction', update) }
  }, [editor])

  // Auto-save toutes les 30s
  useEffect(() => {
    const t = setInterval(save, 30000)
    return () => clearInterval(t)
  }, [save])

  async function exportDocx() {
    if (!editor) return
    setExportLoading(true)
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projetId: id, html: editor.getHTML(), titre }) })
      if (!res.ok) throw new Error('Erreur export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `${titre.replace(/[^a-zA-Z0-9À-ɏ\s]/g, '').trim()}.docx`
      a.click(); URL.revokeObjectURL(url)
    } catch (e) { alert('Erreur : ' + e.message) }
    setExportLoading(false)
  }

  function applyFont(f) { setFont(f); editor?.chain().focus().setFontFamily(f).run() }
  function applySize(s) { setFontSize(s); editor?.chain().focus().setFontSize(`${s}pt`).run() }

  const selectCls = "text-xs bg-white border border-stone-200 rounded px-2 py-1 text-stone-700 focus:outline-none focus:border-gold/40 cursor-pointer"

  async function sendChatMessage(text) {
    const msg = (text || chatInput).trim()
    if (!msg || chatLoading) return
    setChatInput('')
    const newMessages = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newMessages)
    setChatLoading(true)
    try {
      const history = newMessages.slice(0, -1) // tout sauf le dernier (déjà envoyé)
      const res = await fetch('/api/layout-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Erreur inattendue.' }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Impossible de joindre l\'assistant.' }])
    }
    setChatLoading(false)
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function insertTDM() {
    if (!editor) return

    const json = editor.getJSON()
    const titres = []

    function extraire(nodes) {
      if (!nodes) return
      for (const node of nodes) {
        if (node.type === 'heading' && node.attrs?.level === 1) {
          const texte = (node.content || []).map(c => c.text || '').join('').trim()
          if (texte) titres.push(texte)
        }
        if (node.content) extraire(node.content)
      }
    }
    extraire(json.content)

    if (titres.length === 0) {
      alert('Aucun Titre 1 trouvé. Utilisez le style "Titre 1" pour vos chapitres.')
      return
    }

    const tdmHTML = [
      '<h1>Table des matières</h1>',
      ...titres.map(t => `<p>${t}</p>`),
      '<p></p>',
    ].join('')

    editor.chain().focus().insertContentAt(0, tdmHTML).run()
  }

  if (loading) return (
    <main className="min-h-screen bg-[#f5f4f1] flex items-center justify-center">
      <p className="text-stone-500 text-sm">Chargement de l'éditeur…</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#f5f4f1] flex flex-col">
      {/* Header */}
      <header className="toolbar-print-hide border-b border-stone-200 px-6 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 bg-white">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="font-[family-name:var(--font-playfair)] text-lg font-bold text-gold">Le Scribe</a>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500 truncate max-w-xs">{titre}</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-stone-400">Sauvegarde…</span>}
          <button onClick={save} className="text-xs text-stone-500 hover:text-stone-900 border border-stone-200 rounded-lg px-3 py-1.5 transition">
            Sauvegarder
          </button>
          <button onClick={() => window.print()}
            className="text-xs border border-stone-200 text-stone-500 hover:text-stone-900 hover:border-gold/30 rounded-lg px-3 py-1.5 transition">
            PDF
          </button>
          <button onClick={exportDocx} disabled={exportLoading}
            className="text-xs bg-gold text-bg hover:bg-gold2 rounded-lg px-3 py-1.5 transition disabled:opacity-50 font-medium">
            {exportLoading ? '…' : '↓ Télécharger DOCX'}
          </button>
          <Link href={`/projets/${id}`} className="text-xs text-stone-500 hover:text-stone-900 border border-stone-200 rounded-lg px-3 py-1.5 transition">Générateur</Link>
          <Link href="/dashboard" className="text-xs text-stone-500 hover:text-stone-900 transition">← Accueil</Link>
        </div>
      </header>

      {/* Toolbar */}
      <div className="toolbar-print-hide bg-stone-50 border-b border-stone-200 px-4 py-2 flex items-center gap-1 flex-wrap flex-shrink-0 sticky top-[57px] z-10">

        {/* Type de texte */}
        <select value={currentType}
          onChange={e => {
            const v = e.target.value
            if (v === 'p') editor?.chain().focus().setParagraph().run()
            else if (v === 'ul') editor?.chain().focus().toggleBulletList().run()
            else if (v === 'ol') editor?.chain().focus().toggleOrderedList().run()
            else editor?.chain().focus().toggleHeading({ level: parseInt(v) }).run()
          }}
          className={`${selectCls} mr-1`}>
          <option value="p">Corps de texte</option>
          <option value="1">Titre 1</option>
          <option value="2">Titre 2</option>
          <option value="3">Titre 3</option>
          <option value="ul">Liste à puces</option>
          <option value="ol">Liste numérotée</option>
        </select>

        {/* Police */}
        <select value={font} onChange={e => applyFont(e.target.value)} className={`${selectCls} mr-1`}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Taille */}
        <select value={fontSize} onChange={e => applySize(e.target.value)} className={`${selectCls} w-14 mr-1`}>
          {SIZES.map(s => <option key={s} value={String(s)}>{s}</option>)}
        </select>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Couleur du texte */}
        <div className="flex items-center gap-0.5 mr-1">
          {['#1c1917', '#6b7280', '#9ca3af', '#d1d5db'].map(c => (
            <button key={c} onClick={() => editor?.chain().focus().setColor(c).run()}
              title={c} className="w-4 h-4 rounded-full border border-border/50 hover:scale-110 transition-transform flex-shrink-0"
              style={{ background: c }} />
          ))}
          <input type="color" title="Couleur personnalisée"
            onChange={e => editor?.chain().focus().setColor(e.target.value).run()}
            className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent" style={{ appearance: 'none' }} />
          <button onClick={() => editor?.chain().focus().unsetColor().run()}
            title="Couleur par défaut" className="text-xs text-muted2 hover:text-muted px-0.5">✕</button>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Styles */}
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Gras (Ctrl+B)"><b>G</b></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italique (Ctrl+I)"><i>I</i></ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Souligné (Ctrl+U)"><u>S</u></ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Alignement */}
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} title="Aligner à gauche">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="9" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="0" y="11" width="7" height="2" rx="1"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="Centrer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="2.5" y="5" width="9" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="3.5" y="11" width="7" height="2" rx="1"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="Aligner à droite">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="5" y="5" width="9" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="7" y="11" width="7" height="2" rx="1"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign('justify').run()} active={editor?.isActive({ textAlign: 'justify' })} title="Justifier">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="14" height="2" rx="1"/><rect x="0" y="9" width="14" height="2" rx="1"/><rect x="0" y="11" width="14" height="2" rx="1"/></svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Listes */}
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Liste à puces">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2" r="1.5"/><rect x="4" y="1" width="10" height="2" rx="1"/><circle cx="1.5" cy="7" r="1.5"/><rect x="4" y="6" width="10" height="2" rx="1"/><circle cx="1.5" cy="12" r="1.5"/><rect x="4" y="11" width="10" height="2" rx="1"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Liste numérotée">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="3.5" fontSize="4" fontFamily="serif">1.</text><rect x="5" y="1" width="9" height="2" rx="1"/><text x="0" y="8.5" fontSize="4" fontFamily="serif">2.</text><rect x="5" y="6" width="9" height="2" rx="1"/><text x="0" y="13.5" fontSize="4" fontFamily="serif">3.</text><rect x="5" y="11" width="9" height="2" rx="1"/></svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Indentation */}
        <ToolbarButton
          onClick={() => {
            if (!editor) return
            if (editor.isActive('listItem')) editor.chain().focus().sinkListItem('listItem').run()
            else { const { indent = 0 } = editor.getAttributes('paragraph'); editor.chain().focus().updateAttributes('paragraph', { indent: Math.min(indent + 1, 8) }).run() }
          }} title="Augmenter le retrait (Tab)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="3" y="5" width="11" height="2" rx="1"/><rect x="3" y="9" width="11" height="2" rx="1"/><rect x="0" y="11" width="14" height="2" rx="1"/><polygon points="0,5 0,9 2.5,7"/></svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            if (!editor) return
            if (editor.isActive('listItem')) editor.chain().focus().liftListItem('listItem').run()
            else { const { indent = 0 } = editor.getAttributes('paragraph'); if (indent > 0) editor.chain().focus().updateAttributes('paragraph', { indent: indent - 1 }).run() }
          }} title="Diminuer le retrait (Shift+Tab)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="3" y="5" width="11" height="2" rx="1"/><rect x="3" y="9" width="11" height="2" rx="1"/><rect x="0" y="11" width="14" height="2" rx="1"/><polygon points="3,5 3,9 0.5,7"/></svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Annuler/Rétablir */}
        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Annuler (Ctrl+Z)">↩</ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Rétablir (Ctrl+Y)">↪</ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton onClick={insertTDM} title="Insérer la table des matières à partir des Titres 1">
          ☰ TDM
        </ToolbarButton>

        <ToolbarButton onClick={() => window.print()} title="Aperçu d'impression / PDF">
          Aperçu PDF
        </ToolbarButton>

        {/* Bouton conseils mise en page — tout à droite */}
        <div className="flex-1" />
        <button
          onClick={() => setChatOpen(o => !o)}
          title="Conseils mise en page"
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
            chatOpen
              ? 'bg-gold/20 text-gold border border-gold/30'
              : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200 border border-transparent'
          }`}>
          ✦ Mise en page
        </button>
      </div>

      {/* Zone principale : éditeur + panneau latéral */}
      <div className="flex-1 flex overflow-hidden">

        {/* Zone d'édition — fond clair autour de la feuille blanche */}
        <div className="print-scroll-area flex-1 overflow-y-auto bg-[#e8e5e0] py-10 px-4">
          <div
            ref={containerRef}
            className="page-container bg-white shadow-[0_4px_40px_rgba(0,0,0,0.6)] mx-auto rounded-sm"
            style={{ width: '210mm', minHeight: '297mm', padding: '25mm 20mm 25mm 28mm' }}>
            <EditorContent editor={editor} className="h-full" />
          </div>
        </div>

        {/* Panneau conseils mise en page */}
        {chatOpen && (
          <div className="toolbar-print-hide w-80 flex-shrink-0 border-l border-stone-200 bg-white flex flex-col">
            {/* En-tête */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 flex-shrink-0">
              <div>
                <p className="text-sm font-medium text-stone-900">✦ Mise en page</p>
                <p className="text-xs text-stone-400">Conseils & bonnes pratiques</p>
              </div>
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <button onClick={() => setChatMessages([])} className="text-xs text-stone-400 hover:text-gold transition">↩ Retour</button>
                )}
                <button onClick={() => setChatOpen(false)} className="text-stone-400 hover:text-stone-900 transition text-lg leading-none">×</button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {chatMessages.length === 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Posez vos questions sur la structure, la typographie ou la présentation de votre livre.
                  </p>
                  <div className="flex flex-col gap-2 mt-1">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => sendChatMessage(s)}
                        className="text-left text-xs text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-gold/30 rounded-lg px-3 py-2 transition leading-relaxed">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.length > 0 && !chatLoading && (
                <button
                  onClick={() => setChatMessages([])}
                  className="text-xs text-stone-400 hover:text-gold border border-stone-200 hover:border-gold/30 rounded-lg px-3 py-1.5 transition self-start">
                  ← Autres suggestions
                </button>
              )}

              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.role === 'user' ? (
                    <div className="bg-gold/10 border border-gold/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[90%]">
                      <p className="text-xs text-stone-800 leading-relaxed">{m.content}</p>
                    </div>
                  ) : (
                    <div className="bg-stone-100 border border-stone-200 rounded-xl rounded-tl-sm px-3 py-2 max-w-[95%]">
                      <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-start">
                  <div className="bg-stone-100 border border-stone-200 rounded-xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-stone-200 px-3 py-3 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                  placeholder="Votre question…"
                  className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-gold/40 transition"
                />
                <button
                  onClick={() => sendChatMessage()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-gold hover:bg-gold2 text-bg rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-40">
                  ↑
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* --- Styles écran de l'éditeur --- */
        .ProseMirror h1 {
          font-size: 22pt;
          font-weight: bold;
          margin: 0 0 0.5em;
          padding-top: 2em;
          color: #1c1917;
        }
        .ProseMirror h1:first-child { padding-top: 0; }
        .ProseMirror h1:not(:first-child)::before {
          content: '— nouvelle page —';
          display: block;
          font-family: Georgia, serif;
          font-size: 9pt;
          font-weight: normal;
          font-style: italic;
          color: #ccc;
          text-align: center;
          border-top: 1px dashed #e5e7eb;
          padding-top: 1.5em;
          margin-bottom: 1.5em;
          letter-spacing: 0.05em;
        }
        .ProseMirror h2 { font-size: 16pt; font-weight: bold; margin: 1em 0 0.5em; color: #1c1917; }
        .ProseMirror h3 { font-size: 13pt; font-weight: bold; margin: 0.8em 0 0.3em; color: #1c1917; }
        .ProseMirror p { margin: 0 0 0.6em; text-indent: 1.2em; word-wrap: break-word; overflow-wrap: break-word; color: #1c1917; }
        .ProseMirror p:first-child,
        .ProseMirror h1 + p { text-indent: 0; }
        .ProseMirror ul, .ProseMirror ol { margin: 0.5em 0 0.8em 1.5em; padding: 0; }
        .ProseMirror ul { list-style-type: disc; }
        .ProseMirror ol { list-style-type: decimal; }
        .ProseMirror li { margin: 0.2em 0; text-indent: 0; line-height: 1.7; color: #1c1917; }
        .ProseMirror li p { margin: 0; text-indent: 0; }
        .ProseMirror ul ul, .ProseMirror ol ol, .ProseMirror ul ol, .ProseMirror ol ul { margin-left: 1.5em; margin-top: 0.2em; }
        .ProseMirror { outline: none; }

        /* --- Impression / PDF --- */
        @page {
          size: A4;
          margin: 25mm 20mm 22mm 28mm;
          @bottom-center {
            content: counter(page);
            font-family: Georgia, serif;
            font-size: 10pt;
            color: #999;
          }
        }

        @media print {
          .toolbar-print-hide { display: none !important; }
          body, html { background: white !important; margin: 0 !important; padding: 0 !important; color: #1c1917 !important; }
          main { display: block !important; height: auto !important; overflow: visible !important; }
          .print-scroll-area { background: white !important; padding: 0 !important; overflow: visible !important; display: block !important; }
          .page-container {
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .ProseMirror h1 { page-break-before: always; padding-top: 0; }
          .ProseMirror h1:first-child { page-break-before: auto; }
          .ProseMirror h1::before { display: none !important; }
          .ProseMirror p { page-break-inside: avoid; }
          .ProseMirror h2, .ProseMirror h3 { page-break-after: avoid; }
          .ProseMirror ul, .ProseMirror ol { page-break-inside: avoid; }
          .ProseMirror li { page-break-inside: avoid; }
        }
      `}</style>
    </main>
  )
}

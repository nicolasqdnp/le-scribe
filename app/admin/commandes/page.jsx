'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'nicolas.salafranque@gmail.com'

const TIER_LABELS = {
  livre: 'Livre (tarif lancement)',
  pack3: 'Pack de 3',
  eglise: 'Pack Église (10 ex.)',
  dedicace: 'Livre dédicacé + ebook',
  echange: 'Livre + échange',
  ebook: 'Ebook',
  merci: 'Don merci',
  don_libre: 'Don libre',
}

const PHYSICAL = ['livre', 'pack3', 'eglise', 'dedicace', 'echange']

const DARK = {
  bg: '#0e0e0e', surface: '#1a1a1a', surface2: '#222', border: '#2a2a2a',
  text: '#e8dcc8', text2: '#c8b898', text3: '#a09070',
  muted: '#555', gold: '#e8c87a',
  shipped: '#0a120a', shippedBorder: '#1a3a1a', shippedText: '#5cba60',
  pendingBg: '#2a1a0a', pendingText: '#e8c87a',
}
const LIGHT = {
  bg: '#f7f4ef', surface: '#eeeae3', surface2: '#e5e0d8', border: '#d8d0c4',
  text: '#1a1510', text2: '#4a3f30', text3: '#7a6a50',
  muted: '#a09070', gold: '#8a5a20',
  shipped: '#f0f7f0', shippedBorder: '#c0d8c0', shippedText: '#2e7d32',
  pendingBg: '#fff8ee', pendingText: '#8a5a20',
}

function formatAddr(addr) {
  if (!addr) return '—'
  const { line1, line2, postal_code, city, country } = addr
  return [line1, line2, `${postal_code} ${city}`, country].filter(Boolean).join(', ')
}

function SortIcon({ col, sort, C }) {
  if (sort.col !== col) return <span style={{ color: C.muted, marginLeft: 4 }}>↕</span>
  return <span style={{ color: C.gold, marginLeft: 4 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

function ThHead({ label, col, sort, onSort, C }) {
  return (
    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: C.text }} onClick={() => onSort(col)}>
      {label}<SortIcon col={col} sort={sort} C={C} />
    </th>
  )
}

function ThemeMenu({ theme, setTheme, C }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const options = [
    { value: 'system', label: 'Identique au système', icon: '💻' },
    { value: 'light',  label: 'Thème clair',          icon: '☀️' },
    { value: 'dark',   label: 'Thème sombre',          icon: '🌙' },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Changer le thème"
        style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '7px 12px', cursor: 'pointer', fontSize: 18, lineHeight: 1,
          color: C.text2, display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        ⚙️ <span style={{ fontSize: 12, color: C.text3 }}>Thème</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '4px', minWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,.3)',
        }}>
          {options.map(o => (
            <button key={o.value} onClick={() => { setTheme(o.value); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', background: theme === o.value ? C.surface2 : 'transparent',
              border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13,
              color: theme === o.value ? C.text : C.text3, fontWeight: theme === o.value ? 600 : 400,
              textAlign: 'left',
            }}>
              <span>{o.icon}</span> {o.label}
              {theme === o.value && <span style={{ marginLeft: 'auto', color: C.gold }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommandesAdmin() {
  const [rows, setRows] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [resending, setResending] = useState(null)
  const [resendingOrder, setResendingOrder] = useState(null)
  const [creatingLabel, setCreatingLabel] = useState(null)
  const [auth, setAuth] = useState(null)
  const [search, setSearch] = useState('')
  const [sortP, setSortP] = useState({ col: 'created_at', dir: 'asc' })
  const [sortN, setSortN] = useState({ col: 'created_at', dir: 'asc' })
  const [sortO, setSortO] = useState({ col: 'created_at', dir: 'desc' })
  const [theme, setTheme] = useState('dark')
  const [systemDark, setSystemDark] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = e => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  const C = dark ? DARK : LIGHT

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        setAuth(false)
      } else {
        setAuth(true)
        load()
      }
    })
  }, [])

  async function load() {
    const [contribRes, ordersRes] = await Promise.all([
      fetch('/api/admin/contributions'),
      fetch('/api/admin/orders'),
    ])
    const contribData = await contribRes.json()
    const ordersData = await ordersRes.json()
    setRows(contribData)
    setOrders(Array.isArray(ordersData) ? ordersData : [])
    setLoading(false)
  }

  async function toggleShipped(row) {
    setToggling(row.id)
    await fetch('/api/admin/contributions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, shipped: !row.shipped_at }),
    })
    await load()
    setToggling(null)
  }

  async function resendEpub(row) {
    setResending(row.id)
    await fetch('/api/admin/resend-epub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contribution_id: row.id }),
    })
    setResending(null)
    alert(`Email renvoyé à ${row.email}`)
  }

  async function createLabel(order) {
    setCreatingLabel(order.id)
    try {
      const res = await fetch('/api/admin/create-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (data.label_url) {
        window.open(data.label_url, '_blank')
      } else {
        alert('Erreur : ' + (data.error || 'inconnue'))
      }
      await load()
    } catch (e) {
      alert('Erreur réseau')
    }
    setCreatingLabel(null)
  }

  async function toggleOrderShipped(order) {
    setToggling(order.id)
    await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, shipped: !order.shipped_at }),
    })
    await load()
    setToggling(null)
  }

  async function resendEpubOrder(order) {
    setResendingOrder(order.id)
    await fetch('/api/admin/resend-epub-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id }),
    })
    await load()
    setResendingOrder(null)
    alert(`Email renvoyé à ${order.email}`)
  }

  function handleSort(setSort, col) {
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function sortRows(arr, sort) {
    return [...arr].sort((a, b) => {
      let va, vb
      if (sort.col === 'amount') { va = a.total_amount || a.amount; vb = b.total_amount || b.amount }
      else if (sort.col === 'public_name') { va = (a.public_name || a.shipping_name || '').toLowerCase(); vb = (b.public_name || b.shipping_name || '').toLowerCase() }
      else if (sort.col === 'email') { va = a.email?.toLowerCase(); vb = b.email?.toLowerCase() }
      else if (sort.col === 'tier_id') { va = TIER_LABELS[a.tier_id] || a.tier_id; vb = TIER_LABELS[b.tier_id] || b.tier_id }
      else if (sort.col === 'shipped') { va = a.shipped_at ? 1 : 0; vb = b.shipped_at ? 1 : 0 }
      else { va = a.created_at; vb = b.created_at }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }

  function filterRows(arr) {
    if (!search.trim()) return arr
    const q = search.toLowerCase()
    return arr.filter(r =>
      r.email?.toLowerCase().includes(q) ||
      r.public_name?.toLowerCase().includes(q) ||
      r.shipping_name?.toLowerCase().includes(q) ||
      TIER_LABELS[r.tier_id]?.toLowerCase().includes(q) ||
      formatAddr(r.shipping_address).toLowerCase().includes(q)
    )
  }

  function filterOrders(arr) {
    if (!search.trim()) return arr
    const q = search.toLowerCase()
    return arr.filter(r =>
      r.email?.toLowerCase().includes(q) ||
      r.product?.toLowerCase().includes(q) ||
      r.shipping_name?.toLowerCase().includes(q) ||
      formatAddr(r.shipping_address).toLowerCase().includes(q)
    )
  }

  const allPhysical = useMemo(() => rows?.filter(r => PHYSICAL.includes(r.tier_id)) ?? [], [rows])
  const allNonPhysical = useMemo(() => rows?.filter(r => !PHYSICAL.includes(r.tier_id)) ?? [], [rows])
  const physical = useMemo(() => sortRows(filterRows(allPhysical), sortP), [allPhysical, search, sortP])
  const nonPhysical = useMemo(() => sortRows(filterRows(allNonPhysical), sortN), [allNonPhysical, search, sortN])
  const boutique = useMemo(() => sortRows(filterOrders(orders), sortO), [orders, search, sortO])
  const nbEnvoye = allPhysical.filter(r => r.shipped_at).length

  const centerStyle = { minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3, fontFamily: 'system-ui' }

  if (auth === null) return <div style={centerStyle}>Vérification…</div>
  if (auth === false) return <div style={{ ...centerStyle, color: C.gold }}>Accès refusé — connecte-toi avec le bon compte.</div>

  const thStyle = { textAlign: 'left', padding: '8px 12px', fontWeight: 700, fontSize: 13, color: C.text }
  const tdStyle = { padding: '10px 12px', verticalAlign: 'top', color: C.text }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif', padding: '40px 24px', transition: 'background .2s, color .2s' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: C.text }}>Commandes campagne</h1>
            <p style={{ color: C.text3, fontSize: 13, margin: 0 }}>
              {loading ? '…' : `${allPhysical.length} envois physiques — ${nbEnvoye} envoyés, ${allPhysical.length - nbEnvoye} restants`}
            </p>
          </div>
          <ThemeMenu theme={theme} setTheme={setTheme} C={C} />
        </div>

        {/* Barre de recherche */}
        <input
          type="text"
          placeholder="Rechercher un client (nom, email, palier, adresse…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 440, padding: '9px 14px', borderRadius: 8,
            background: C.surface, border: `1px solid ${C.border}`, color: C.text,
            fontSize: 13, outline: 'none', marginBottom: 28, boxSizing: 'border-box',
          }}
        />

        {loading && <p style={{ color: C.text3 }}>Chargement…</p>}

        {!loading && (
          <>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Envois physiques ({physical.length})
            </h2>
            <div style={{ overflowX: 'auto', marginBottom: 48 }}>
              <table style={{ minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <ThHead label="Statut" col="shipped" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <ThHead label="Prénom dédicace" col="public_name" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <th style={thStyle}>Destinataire</th>
                    <ThHead label="Email" col="email" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <ThHead label="Palier" col="tier_id" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <ThHead label="Montant" col="amount" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <th style={thStyle}>Adresse</th>
                    <ThHead label="Date" col="created_at" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <th style={{ ...thStyle, minWidth: 160 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {physical.length === 0 && (
                    <tr><td colSpan={9} style={{ ...tdStyle, color: C.muted, textAlign: 'center', padding: 24 }}>Aucun résultat</td></tr>
                  )}
                  {physical.map(row => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}`, background: row.shipped_at ? C.shipped : 'transparent' }}>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                          fontSize: 11, fontWeight: 600,
                          background: row.shipped_at ? C.shippedBorder : C.pendingBg,
                          color: row.shipped_at ? C.shippedText : C.pendingText,
                          border: `1px solid ${row.shipped_at ? C.shippedText + '44' : C.gold + '44'}`,
                        }}>
                          {row.shipped_at ? 'Envoyé' : 'À envoyer'}
                        </span>
                      </td>
                      <td style={tdStyle}>{row.public_name || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={tdStyle}>{row.shipping_name || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={{ ...tdStyle, color: C.text2 }}>{row.email}</td>
                      <td style={tdStyle}>{TIER_LABELS[row.tier_id] || row.tier_id}</td>
                      <td style={{ ...tdStyle, color: C.gold, fontWeight: 600 }}>{((row.total_amount || row.amount) / 100).toFixed(0)} €</td>
                      <td style={{ ...tdStyle, color: C.text2, maxWidth: 200 }}>{formatAddr(row.shipping_address)}</td>
                      <td style={{ ...tdStyle, color: C.text2, whiteSpace: 'nowrap' }}>{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ ...tdStyle, minWidth: 160 }}>
                        <button onClick={() => toggleShipped(row)} disabled={toggling === row.id} style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                          border: `1px solid ${C.border}`,
                          background: row.shipped_at ? C.surface : C.gold,
                          color: row.shipped_at ? C.text3 : dark ? '#0e0e0e' : '#fff',
                          fontWeight: 600, transition: 'all .15s', whiteSpace: 'nowrap',
                          opacity: toggling === row.id ? 0.5 : 1,
                        }}>
                          {row.shipped_at ? '↩ Annuler' : '✓ Marquer envoyé'}
                        </button>
                        {['dedicace', 'echange'].includes(row.tier_id) && (
                          <button onClick={() => resendEpub(row)} disabled={resending === row.id} style={{
                            display: 'block', marginTop: 6,
                            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            border: `1px solid ${C.border}`, background: C.surface, color: C.gold,
                            fontWeight: 600, whiteSpace: 'nowrap',
                            opacity: resending === row.id ? 0.5 : 1,
                          }}>
                            {resending === row.id ? '…' : '📨 Renvoyer ebook'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Dons & ebooks ({nonPhysical.length})
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 700, borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <ThHead label="Prénom" col="public_name" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Email" col="email" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Palier" col="tier_id" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Montant" col="amount" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Date" col="created_at" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <th style={{ ...thStyle, minWidth: 160 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {nonPhysical.length === 0 && (
                    <tr><td colSpan={6} style={{ ...tdStyle, color: C.muted, textAlign: 'center', padding: 24 }}>Aucun résultat</td></tr>
                  )}
                  {nonPhysical.map(row => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={tdStyle}>{row.public_name || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={{ ...tdStyle, color: C.text2 }}>{row.email}</td>
                      <td style={tdStyle}>{TIER_LABELS[row.tier_id] || row.tier_id}</td>
                      <td style={{ ...tdStyle, color: C.gold, fontWeight: 600 }}>{((row.total_amount || row.amount) / 100).toFixed(0)} €</td>
                      <td style={{ ...tdStyle, color: C.text2 }}>{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={tdStyle}>
                        {['ebook', 'dedicace', 'echange'].includes(row.tier_id) ? (
                          <button onClick={() => resendEpub(row)} disabled={resending === row.id} style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            border: `1px solid ${C.border}`, background: C.surface, color: C.gold,
                            fontWeight: 600, whiteSpace: 'nowrap',
                            opacity: resending === row.id ? 0.5 : 1,
                          }}>
                            {resending === row.id ? '…' : '📨 Renvoyer ebook'}
                          </button>
                        ) : <span style={{ color: C.muted }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commandes boutique */}
            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14, marginTop: 48, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Commandes boutique ({boutique.length})
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 800, borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <ThHead label="Statut" col="shipped" sort={sortO} onSort={col => handleSort(setSortO, col)} C={C} />
                    <ThHead label="Email" col="email" sort={sortO} onSort={col => handleSort(setSortO, col)} C={C} />
                    <ThHead label="Produit" col="product" sort={sortO} onSort={col => handleSort(setSortO, col)} C={C} />
                    <ThHead label="Montant" col="amount" sort={sortO} onSort={col => handleSort(setSortO, col)} C={C} />
                    <th style={thStyle}>Destinataire</th>
                    <th style={thStyle}>Adresse</th>
                    <ThHead label="Date" col="created_at" sort={sortO} onSort={col => handleSort(setSortO, col)} C={C} />
                    <th style={{ ...thStyle, minWidth: 160 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {boutique.length === 0 && (
                    <tr><td colSpan={8} style={{ ...tdStyle, color: C.muted, textAlign: 'center', padding: 24 }}>Aucun résultat</td></tr>
                  )}
                  {boutique.map(order => {
                    const isPaid = order.status === 'paid'
                    const isEpub = order.product === 'epub'
                    const isLivre = order.product === 'livre'
                    const PRODUCT_LABELS = { epub: 'EPUB', livre: 'Livre physique', pack3: 'Pack 3 ex.', pack10: 'Pack Église 10 ex.', physique: 'Livre (précommande)' }
                    return (
                      <tr key={order.id} style={{ borderBottom: `1px solid ${C.border}`, background: order.shipped_at ? C.shipped : 'transparent' }}>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                            fontSize: 11, fontWeight: 600,
                            background: isPaid ? C.shippedBorder : C.pendingBg,
                            color: isPaid ? C.shippedText : C.pendingText,
                            border: `1px solid ${isPaid ? C.shippedText + '44' : C.gold + '44'}`,
                          }}>
                            {isPaid ? 'Payé' : 'En attente'}
                          </span>
                          {order.shipped_at && (
                            <span style={{ display: 'block', marginTop: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.shippedBorder, color: C.shippedText, border: `1px solid ${C.shippedText}44` }}>
                              ✓ Envoyé
                            </span>
                          )}
                          {order.delivery === 'pickup' && (
                            <span style={{ display: 'block', marginTop: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.surface2, color: C.gold, border: `1px solid ${C.gold}44` }}>
                              🏛️ Retrait église
                            </span>
                          )}
                          {order.delivery === 'relay' && (
                            <span style={{ display: 'block', marginTop: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.surface2, color: C.gold, border: `1px solid ${C.gold}44` }}>
                              📦 Point Relais
                            </span>
                          )}
                          {order.delivery === 'home-mr' && (
                            <span style={{ display: 'block', marginTop: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: C.surface2, color: C.gold, border: `1px solid ${C.gold}44` }}>
                              🏠 Domicile MR
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: C.text2 }}>{order.email}</td>
                        <td style={tdStyle}>{PRODUCT_LABELS[order.product] || order.product}</td>
                        <td style={{ ...tdStyle, color: C.gold, fontWeight: 600 }}>{(order.amount / 100).toFixed(2)} €</td>
                        <td style={tdStyle}>{order.shipping_name || <span style={{ color: C.muted }}>—</span>}</td>
                        <td style={{ ...tdStyle, color: C.text2, maxWidth: 220 }}>
                          {order.relay_point
                            ? <span>📦 {order.relay_point.Nom}<br /><span style={{ fontSize: 11 }}>{order.relay_point.Adresse1}, {order.relay_point.CP} {order.relay_point.Ville}</span></span>
                            : formatAddr(order.shipping_address)}
                        </td>
                        <td style={{ ...tdStyle, color: C.text2, whiteSpace: 'nowrap' }}>{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                        <td style={{ ...tdStyle, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {!isEpub && isPaid && (order.delivery === 'relay' || order.delivery === 'home-mr') && !order.shipped_at && (
                            <button onClick={() => createLabel(order)} disabled={creatingLabel === order.id} style={{
                              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                              border: `1px solid ${C.gold}`, background: C.gold,
                              color: '#0e0e0e', fontWeight: 700, whiteSpace: 'nowrap',
                              opacity: creatingLabel === order.id ? 0.5 : 1,
                            }}>
                              {creatingLabel === order.id ? '…' : '🏷️ Créer étiquette'}
                            </button>
                          )}
                          {!isEpub && isPaid && (
                            <button onClick={() => toggleOrderShipped(order)} disabled={toggling === order.id} style={{
                              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                              border: `1px solid ${order.shipped_at ? C.border : C.gold}`,
                              background: order.shipped_at ? C.surface : C.gold,
                              color: order.shipped_at ? C.text3 : '#0e0e0e',
                              fontWeight: 600, whiteSpace: 'nowrap',
                              opacity: toggling === order.id ? 0.5 : 1,
                            }}>
                              {toggling === order.id ? '…' : order.shipped_at ? '↩ Annuler envoi' : '✓ Marquer envoyé'}
                            </button>
                          )}
                          {isEpub && isPaid && (
                            <button onClick={() => resendEpubOrder(order)} disabled={resendingOrder === order.id} style={{
                              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                              border: `1px solid ${C.border}`, background: C.surface, color: C.gold,
                              fontWeight: 600, whiteSpace: 'nowrap',
                              opacity: resendingOrder === order.id ? 0.5 : 1,
                            }}>
                              {resendingOrder === order.id ? '…' : '📨 Renvoyer ebook'}
                            </button>
                          )}
                          {order.tracking_url && (
                            <a href={order.tracking_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.gold, textDecoration: 'underline' }}>
                              Suivi colis →
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

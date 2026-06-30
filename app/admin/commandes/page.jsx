'use client'

import { useEffect, useState, useMemo } from 'react'
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
  text: '#e8dcc8', text2: '#b0a090', text3: '#6a5a4a', muted: '#4a4a4a',
  gold: '#c9a77d', shipped: '#0a120a', shippedBorder: '#1a2a1a', shippedText: '#4caf50',
  pendingBg: '#2a1a0a', pendingText: '#c9a77d',
}
const LIGHT = {
  bg: '#f7f4ef', surface: '#eeeae3', surface2: '#e5e0d8', border: '#d8d0c4',
  text: '#1a1510', text2: '#4a3f30', text3: '#7a6a50', muted: '#a09070',
  gold: '#9a6f3a', shipped: '#f0f7f0', shippedBorder: '#c0d8c0', shippedText: '#2e7d32',
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
    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: C.text3 }} onClick={() => onSort(col)}>
      {label}<SortIcon col={col} sort={sort} C={C} />
    </th>
  )
}

export default function CommandesAdmin() {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [resending, setResending] = useState(null)
  const [auth, setAuth] = useState(null)
  const [search, setSearch] = useState('')
  const [sortP, setSortP] = useState({ col: 'created_at', dir: 'asc' })
  const [sortN, setSortN] = useState({ col: 'created_at', dir: 'asc' })
  const [dark, setDark] = useState(true)
  const router = useRouter()

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
    const res = await fetch('/api/admin/contributions')
    const data = await res.json()
    setRows(data)
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

  const allPhysical = useMemo(() => rows?.filter(r => PHYSICAL.includes(r.tier_id)) ?? [], [rows])
  const allNonPhysical = useMemo(() => rows?.filter(r => !PHYSICAL.includes(r.tier_id)) ?? [], [rows])
  const physical = useMemo(() => sortRows(filterRows(allPhysical), sortP), [allPhysical, search, sortP])
  const nonPhysical = useMemo(() => sortRows(filterRows(allNonPhysical), sortN), [allNonPhysical, search, sortN])
  const nbEnvoye = allPhysical.filter(r => r.shipped_at).length

  const centerStyle = { minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3, fontFamily: 'system-ui' }

  if (auth === null) return <div style={centerStyle}>Vérification…</div>
  if (auth === false) return <div style={{ ...centerStyle, color: C.gold }}>Accès refusé — connecte-toi avec le bon compte.</div>

  const th = { textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: C.text3 }
  const td = { padding: '10px 12px', verticalAlign: 'top', color: C.text }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif', padding: '40px 24px', transition: 'background .2s, color .2s' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: C.text }}>Commandes campagne</h1>
            <p style={{ color: C.text3, fontSize: 13, margin: 0 }}>
              {loading ? '…' : `${allPhysical.length} envois physiques — ${nbEnvoye} envoyés, ${allPhysical.length - nbEnvoye} restants`}
            </p>
          </div>
          {/* Toggle thème */}
          <button
            onClick={() => setDark(d => !d)}
            title={dark ? 'Passer en thème clair' : 'Passer en thème sombre'}
            style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '7px 12px', cursor: 'pointer', fontSize: 18, lineHeight: 1,
              color: C.text2, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {dark ? '☀️' : '🌙'}
            <span style={{ fontSize: 12, color: C.text3 }}>{dark ? 'Clair' : 'Sombre'}</span>
          </button>
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
            <h2 style={{ fontSize: 11, fontWeight: 600, color: C.text3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Envois physiques ({physical.length})
            </h2>
            <div style={{ overflowX: 'auto', marginBottom: 48 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={th}>Statut</th>
                    <ThHead label="Prénom dédicace" col="public_name" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <th style={th}>Destinataire</th>
                    <ThHead label="Email" col="email" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <ThHead label="Palier" col="tier_id" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <ThHead label="Montant" col="amount" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <th style={th}>Adresse</th>
                    <ThHead label="Date" col="created_at" sort={sortP} onSort={col => handleSort(setSortP, col)} C={C} />
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {physical.length === 0 && (
                    <tr><td colSpan={9} style={{ ...td, color: C.muted, textAlign: 'center', padding: 24 }}>Aucun résultat</td></tr>
                  )}
                  {physical.map(row => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}`, background: row.shipped_at ? C.shipped : 'transparent' }}>
                      <td style={td}>
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
                      <td style={td}>{row.public_name || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={td}>{row.shipping_name || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={{ ...td, color: C.text3 }}>{row.email}</td>
                      <td style={td}>{TIER_LABELS[row.tier_id] || row.tier_id}</td>
                      <td style={{ ...td, color: C.gold, fontWeight: 600 }}>{((row.total_amount || row.amount) / 100).toFixed(0)} €</td>
                      <td style={{ ...td, color: C.text2, maxWidth: 200 }}>{formatAddr(row.shipping_address)}</td>
                      <td style={{ ...td, color: C.text3, whiteSpace: 'nowrap' }}>{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ ...td, display: 'flex', flexDirection: 'column', gap: 6 }}>
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

            <h2 style={{ fontSize: 11, fontWeight: 600, color: C.text3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Dons & ebooks ({nonPhysical.length})
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <ThHead label="Prénom" col="public_name" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Email" col="email" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Palier" col="tier_id" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Montant" col="amount" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <ThHead label="Date" col="created_at" sort={sortN} onSort={col => handleSort(setSortN, col)} C={C} />
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {nonPhysical.length === 0 && (
                    <tr><td colSpan={6} style={{ ...td, color: C.muted, textAlign: 'center', padding: 24 }}>Aucun résultat</td></tr>
                  )}
                  {nonPhysical.map(row => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={td}>{row.public_name || <span style={{ color: C.muted }}>—</span>}</td>
                      <td style={{ ...td, color: C.text3 }}>{row.email}</td>
                      <td style={td}>{TIER_LABELS[row.tier_id] || row.tier_id}</td>
                      <td style={{ ...td, color: C.gold, fontWeight: 600 }}>{((row.total_amount || row.amount) / 100).toFixed(0)} €</td>
                      <td style={{ ...td, color: C.text2 }}>{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={td}>
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
          </>
        )}
      </div>
    </div>
  )
}

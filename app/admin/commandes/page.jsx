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

function formatAddr(addr) {
  if (!addr) return '—'
  const { line1, line2, postal_code, city, country } = addr
  return [line1, line2, `${postal_code} ${city}`, country].filter(Boolean).join(', ')
}

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <span style={{ color: '#3a3a3a', marginLeft: 4 }}>↕</span>
  return <span style={{ color: '#c9a77d', marginLeft: 4 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

function ThHead({ label, col, sort, onSort }) {
  return (
    <th style={{ ...th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => onSort(col)}>
      {label}<SortIcon col={col} sort={sort} />
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
  const router = useRouter()

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

  if (auth === null) return <div style={center}>Vérification…</div>
  if (auth === false) return <div style={{ ...center, color: '#c9a77d' }}>Accès refusé — connecte-toi avec le bon compte.</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', color: '#e8dcc8', fontFamily: 'system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#c9a77d' }}>Commandes campagne</h1>
        <p style={{ color: '#7a6a50', fontSize: 13, marginBottom: 24 }}>
          {loading ? '…' : `${allPhysical.length} envois physiques — ${nbEnvoye} envoyés, ${allPhysical.length - nbEnvoye} restants`}
        </p>

        {/* Barre de recherche */}
        <input
          type="text"
          placeholder="Rechercher un client (nom, email, palier, adresse…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 440, padding: '9px 14px', borderRadius: 8,
            background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8dcc8',
            fontSize: 13, outline: 'none', marginBottom: 28, boxSizing: 'border-box',
          }}
        />

        {loading && <p style={{ color: '#7a6a50' }}>Chargement…</p>}

        {!loading && (
          <>
            <h2 style={sectionTitle}>Envois physiques ({physical.length})</h2>
            <div style={{ overflowX: 'auto', marginBottom: 48 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#7a6a50' }}>
                    <th style={th}>Statut</th>
                    <ThHead label="Prénom dédicace" col="public_name" sort={sortP} onSort={col => handleSort(setSortP, col)} />
                    <th style={th}>Destinataire</th>
                    <ThHead label="Email" col="email" sort={sortP} onSort={col => handleSort(setSortP, col)} />
                    <ThHead label="Palier" col="tier_id" sort={sortP} onSort={col => handleSort(setSortP, col)} />
                    <ThHead label="Montant" col="amount" sort={sortP} onSort={col => handleSort(setSortP, col)} />
                    <th style={th}>Adresse</th>
                    <ThHead label="Date" col="created_at" sort={sortP} onSort={col => handleSort(setSortP, col)} />
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {physical.length === 0 && (
                    <tr><td colSpan={9} style={{ ...td, color: '#4a4a4a', textAlign: 'center', padding: 24 }}>Aucun résultat</td></tr>
                  )}
                  {physical.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #1a1a1a', background: row.shipped_at ? '#0a120a' : 'transparent' }}>
                      <td style={td}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                          fontSize: 11, fontWeight: 600,
                          background: row.shipped_at ? '#1a3a1a' : '#2a1a0a',
                          color: row.shipped_at ? '#4caf50' : '#c9a77d',
                          border: `1px solid ${row.shipped_at ? '#2a5a2a' : '#3a2a1a'}`,
                        }}>
                          {row.shipped_at ? 'Envoyé' : 'À envoyer'}
                        </span>
                      </td>
                      <td style={td}>{row.public_name || <span style={{ color: '#4a4a4a' }}>—</span>}</td>
                      <td style={td}>{row.shipping_name || <span style={{ color: '#4a4a4a' }}>—</span>}</td>
                      <td style={{ ...td, color: '#7a6a50' }}>{row.email}</td>
                      <td style={td}>{TIER_LABELS[row.tier_id] || row.tier_id}</td>
                      <td style={{ ...td, color: '#c9a77d', fontWeight: 600 }}>{((row.total_amount || row.amount) / 100).toFixed(0)} €</td>
                      <td style={{ ...td, color: '#a09070', maxWidth: 200 }}>{formatAddr(row.shipping_address)}</td>
                      <td style={{ ...td, color: '#5a5a5a', whiteSpace: 'nowrap' }}>{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{ ...td, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button onClick={() => toggleShipped(row)} disabled={toggling === row.id} style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                          border: '1px solid #3a2a1a',
                          background: row.shipped_at ? '#1a1a1a' : '#c9a77d',
                          color: row.shipped_at ? '#7a6a50' : '#0e0e0e',
                          fontWeight: 600, transition: 'all .15s', whiteSpace: 'nowrap',
                          opacity: toggling === row.id ? 0.5 : 1,
                        }}>
                          {row.shipped_at ? '↩ Annuler' : '✓ Marquer envoyé'}
                        </button>
                        {['dedicace', 'echange'].includes(row.tier_id) && (
                          <button onClick={() => resendEpub(row)} disabled={resending === row.id} style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            border: '1px solid #3a2a1a', background: '#1a1814', color: '#c9a77d',
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

            <h2 style={sectionTitle}>Dons & ebooks ({nonPhysical.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#7a6a50' }}>
                    <ThHead label="Prénom" col="public_name" sort={sortN} onSort={col => handleSort(setSortN, col)} />
                    <ThHead label="Email" col="email" sort={sortN} onSort={col => handleSort(setSortN, col)} />
                    <ThHead label="Palier" col="tier_id" sort={sortN} onSort={col => handleSort(setSortN, col)} />
                    <ThHead label="Montant" col="amount" sort={sortN} onSort={col => handleSort(setSortN, col)} />
                    <ThHead label="Date" col="created_at" sort={sortN} onSort={col => handleSort(setSortN, col)} />
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {nonPhysical.length === 0 && (
                    <tr><td colSpan={6} style={{ ...td, color: '#4a4a4a', textAlign: 'center', padding: 24 }}>Aucun résultat</td></tr>
                  )}
                  {nonPhysical.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={td}>{row.public_name || <span style={{ color: '#4a4a4a' }}>—</span>}</td>
                      <td style={{ ...td, color: '#7a6a50' }}>{row.email}</td>
                      <td style={td}>{TIER_LABELS[row.tier_id] || row.tier_id}</td>
                      <td style={{ ...td, color: '#c9a77d', fontWeight: 600 }}>{((row.total_amount || row.amount) / 100).toFixed(0)} €</td>
                      <td style={{ ...td, color: '#5a5a5a' }}>{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={td}>
                        {['ebook', 'dedicace', 'echange'].includes(row.tier_id) ? (
                          <button onClick={() => resendEpub(row)} disabled={resending === row.id} style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            border: '1px solid #3a2a1a', background: '#1a1814', color: '#c9a77d',
                            fontWeight: 600, whiteSpace: 'nowrap',
                            opacity: resending === row.id ? 0.5 : 1,
                          }}>
                            {resending === row.id ? '…' : '📨 Renvoyer ebook'}
                          </button>
                        ) : <span style={{ color: '#3a3a3a' }}>—</span>}
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

const th = { textAlign: 'left', padding: '8px 12px', fontWeight: 500 }
const td = { padding: '10px 12px', verticalAlign: 'top' }
const center = { minHeight: '100vh', background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a50', fontFamily: 'system-ui' }
const sectionTitle = { fontSize: 11, fontWeight: 600, color: '#a09070', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }

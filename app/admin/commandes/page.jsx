'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

const ADMIN_EMAIL = 'nicolas.salafranque@gmail.com'

const TIER_LABELS = {
  livre: 'Livre (tarif lancement)',
  pack3: 'Pack de 3',
  eglise: 'Pack Église (10 ex.)',
  dedicace: 'Livre dédicacé',
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

export default function CommandesAdmin() {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [auth, setAuth] = useState(null)
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

  // load() est appelé après vérif auth

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

  const physical = rows?.filter(r => PHYSICAL.includes(r.tier_id)) ?? []
  const nonPhysical = rows?.filter(r => !PHYSICAL.includes(r.tier_id)) ?? []
  const nbEnvoye = physical.filter(r => r.shipped_at).length

  if (auth === null) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a50', fontFamily: 'system-ui' }}>
      Vérification…
    </div>
  )
  if (auth === false) return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a77d', fontFamily: 'system-ui' }}>
      Accès refusé — connecte-toi avec le bon compte.
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e0e', color: '#e8dcc8', fontFamily: 'system-ui, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: '#c9a77d' }}>Commandes campagne</h1>
        <p style={{ color: '#7a6a50', fontSize: 13, marginBottom: 32 }}>
          {loading ? '…' : `${physical.length} envois physiques — ${nbEnvoye} envoyés, ${physical.length - nbEnvoye} restants`}
        </p>

        {loading && <p style={{ color: '#7a6a50' }}>Chargement…</p>}

        {!loading && physical.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#a09070', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11 }}>
              Envois physiques
            </h2>
            <div style={{ overflowX: 'auto', marginBottom: 48 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#7a6a50' }}>
                    <th style={th}>Statut</th>
                    <th style={th}>Prénom dédicace</th>
                    <th style={th}>Destinataire</th>
                    <th style={th}>Email</th>
                    <th style={th}>Palier</th>
                    <th style={th}>Montant</th>
                    <th style={th}>Adresse</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
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
                      <td style={{ ...td, color: '#a09070', maxWidth: 220 }}>{formatAddr(row.shipping_address)}</td>
                      <td style={td}>
                        <button
                          onClick={() => toggleShipped(row)}
                          disabled={toggling === row.id}
                          style={{
                            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            border: '1px solid #3a2a1a',
                            background: row.shipped_at ? '#1a1a1a' : '#c9a77d',
                            color: row.shipped_at ? '#7a6a50' : '#0e0e0e',
                            fontWeight: 600, transition: 'all .15s',
                            opacity: toggling === row.id ? 0.5 : 1,
                          }}
                        >
                          {row.shipped_at ? '↩ Annuler' : '✓ Marquer envoyé'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && nonPhysical.length > 0 && (
          <>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: '#a09070', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Dons & ebooks (pas d'envoi)
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#7a6a50' }}>
                    <th style={th}>Prénom</th>
                    <th style={th}>Email</th>
                    <th style={th}>Palier</th>
                    <th style={th}>Montant</th>
                    <th style={th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {nonPhysical.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={td}>{row.public_name || <span style={{ color: '#4a4a4a' }}>—</span>}</td>
                      <td style={{ ...td, color: '#7a6a50' }}>{row.email}</td>
                      <td style={td}>{TIER_LABELS[row.tier_id] || row.tier_id}</td>
                      <td style={{ ...td, color: '#c9a77d', fontWeight: 600 }}>{((row.total_amount || row.amount) / 100).toFixed(0)} €</td>
                      <td style={{ ...td, color: '#5a5a5a' }}>{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
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

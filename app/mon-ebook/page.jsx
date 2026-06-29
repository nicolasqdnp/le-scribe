'use client'

import { useState } from 'react'

export default function MonEbook() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [url, setUrl] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/ebook-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) {
        setUrl(data.url)
        setState('done')
      } else {
        // Même si on n'a pas trouvé, on affiche le même message (sécurité)
        setState('done')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0c0a', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px', fontFamily: 'Georgia, serif',
    }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ marginBottom: 32 }}>
          <a href="/" style={{ color: '#c9a77d', fontSize: 18, fontWeight: 'bold', textDecoration: 'none' }}>Le Scribe</a>
        </div>
        <div style={{
          background: '#1a1814', border: '1px solid #2a2520', borderRadius: 16, padding: 40,
        }}>
          <h1 style={{ fontSize: 22, color: '#f0ead8', margin: '0 0 12px' }}>Télécharger mon ebook</h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#a09070', margin: '0 0 28px' }}>
            Entrez l'adresse email utilisée lors de votre achat pour accéder à votre lien de téléchargement.
          </p>

          {state === 'idle' || state === 'loading' ? (
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                required
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
                  background: '#13120f', border: '1px solid #2a2520', color: '#e8e0d0',
                  outline: 'none', boxSizing: 'border-box', marginBottom: 16,
                }}
              />
              <button
                type="submit"
                disabled={state === 'loading'}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 15,
                  background: '#c9a77d', color: '#0d0c0a', fontWeight: 'bold',
                  border: 'none', cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: state === 'loading' ? 0.7 : 1,
                }}
              >
                {state === 'loading' ? 'Vérification…' : 'Accéder à mon ebook →'}
              </button>
            </form>
          ) : state === 'error' ? (
            <div>
              <p style={{ color: '#e07070', fontSize: 14 }}>Une erreur est survenue. Réessayez ou contactez nicolas.salafranque@gmail.com</p>
              <button onClick={() => setState('idle')} style={{ marginTop: 16, color: '#c9a77d', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                ← Réessayer
              </button>
            </div>
          ) : url ? (
            <div>
              <p style={{ color: '#4caf50', fontSize: 15, marginBottom: 20 }}>✓ Votre lien de téléchargement est prêt !</p>
              <a
                href={url}
                download
                style={{
                  display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10,
                  background: '#c9a77d', color: '#0d0c0a', fontWeight: 'bold', fontSize: 15,
                  textDecoration: 'none', marginBottom: 16,
                }}
              >
                📖 Télécharger L'urgence des temps (EPUB)
              </a>
              <p style={{ fontSize: 13, color: '#7a6a50', margin: 0 }}>Ce lien est valable 48 heures.</p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#e8e0d0', fontSize: 15, marginBottom: 8 }}>
                Si votre email correspond à une commande, vous pouvez télécharger votre ebook ci-dessous.
              </p>
              <p style={{ fontSize: 13, color: '#7a6a50', marginBottom: 20 }}>
                Aucun lien affiché ? Vérifiez que vous utilisez la bonne adresse email. Si le problème persiste, contactez <a href="mailto:nicolas.salafranque@gmail.com" style={{ color: '#c9a77d' }}>nicolas.salafranque@gmail.com</a>.
              </p>
              <button onClick={() => { setState('idle'); setEmail('') }} style={{ color: '#c9a77d', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                ← Réessayer avec un autre email
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 32, padding: '20px', background: '#13120f', borderRadius: 12, border: '1px solid #2a2520' }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 'bold', color: '#c9a77d' }}>📱 Lire sur Kindle ?</p>
          <p style={{ margin: 0, fontSize: 13, color: '#7a6a50' }}>
            Kindle ne lit pas directement les EPUB. Utilisez <a href="https://send.amazon.com" style={{ color: '#c9a77d' }}>send.amazon.com</a> depuis un ordinateur, ou l'app <strong style={{ color: '#e8e0d0' }}>Send to Kindle</strong> sur mobile.
          </p>
        </div>
      </div>
    </div>
  )
}

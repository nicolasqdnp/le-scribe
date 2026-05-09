'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) {
      setMessage('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      setMessage('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen page-glow flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <a href="/" className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-gold">Le Scribe</a>
          <h1 className="text-xl font-semibold text-cream mt-4 mb-1">Nouveau mot de passe</h1>
          <p className="text-sm text-muted">Choisis un nouveau mot de passe pour ton compte.</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-4">✓</div>
              <p className="text-cream font-medium mb-2">Mot de passe mis à jour !</p>
              <p className="text-sm text-muted">Redirection vers ton tableau de bord…</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  required
                  className="w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Confirmer</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Répète ton mot de passe"
                  required
                  className="w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
                />
              </div>
              {message && (
                <div className="text-sm p-3 rounded-lg bg-err/10 border border-err/20 text-err">{message}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-bg py-3 rounded-lg font-semibold text-sm hover:bg-gold2 transition disabled:opacity-50"
              >
                {loading ? 'Mise à jour…' : 'Enregistrer le mot de passe →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

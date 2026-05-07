'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen page-glow flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <a href="/" className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-gold">Le Scribe</a>
          <h1 className="text-xl font-semibold text-cream mt-4 mb-1">Connexion</h1>
          <p className="text-sm text-muted">Content de te revoir !</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jean@exemple.fr"
                required
                className="w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-widest mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ton mot de passe"
                required
                className="w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-cream placeholder:text-muted2 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition"
              />
            </div>
            {message && (
              <div className="text-sm p-3 rounded-lg bg-err/10 border border-err/20 text-err">
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-bg py-3 rounded-lg font-semibold text-sm hover:bg-gold2 transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Pas encore de compte ?{' '}
          <a href="/inscription" className="text-gold hover:text-gold2 transition">S'inscrire gratuitement</a>
        </p>
      </div>
    </main>
  )
}

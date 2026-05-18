'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
    setGoogleLoading(false)
  }

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
          {/* Mode réinitialisation */}
          {resetMode ? (
            resetSent ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-4">✉️</div>
                <p className="text-cream font-medium mb-2">Email envoyé !</p>
                <p className="text-sm text-muted mb-6">Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.</p>
                <button onClick={() => { setResetMode(false); setResetSent(false) }} className="text-sm text-gold hover:text-gold2 transition">
                  ← Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <p className="text-sm text-muted mb-5">Entre ton email pour recevoir un lien de réinitialisation.</p>
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
                {message && (
                  <div className="text-sm p-3 rounded-lg bg-err/10 border border-err/20 text-err">{message}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold text-bg py-3 rounded-lg font-semibold text-sm hover:bg-gold2 transition disabled:opacity-50"
                >
                  {loading ? 'Envoi…' : 'Envoyer le lien →'}
                </button>
                <button type="button" onClick={() => setResetMode(false)} className="w-full text-sm text-muted hover:text-cream transition">
                  ← Retour à la connexion
                </button>
              </form>
            )
          ) : (
          <>
          {/* Bouton Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-surface2 hover:bg-surface3 border border-border rounded-lg px-4 py-3 text-sm text-cream transition disabled:opacity-50 font-medium mb-6 cursor-pointer"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </button>

          {/* Séparateur */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted2 uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Formulaire email */}
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-muted uppercase tracking-widest">Mot de passe</label>
                <button type="button" onClick={() => setResetMode(true)} className="text-xs text-muted hover:text-gold transition cursor-pointer">
                  Mot de passe oublié ?
                </button>
              </div>
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
              className="w-full bg-gold text-bg py-3 rounded-lg font-semibold text-sm hover:bg-gold2 transition disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>
          </>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Pas encore de compte ?{' '}
          <a href="/inscription" className="text-gold hover:text-gold2 transition">S'inscrire gratuitement</a>
        </p>
      </div>
    </main>
  )
}

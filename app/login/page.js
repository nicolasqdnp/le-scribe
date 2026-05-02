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
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl">✍️</span>
          <h1 className="text-2xl font-bold text-stone-900 mt-2">Connexion</h1>
          <p className="text-stone-500 text-sm mt-1">Content de te revoir !</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jean@exemple.fr"
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Ton mot de passe"
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {message && (
            <div className="text-sm p-3 rounded-lg bg-red-50 text-red-600">
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-3 rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>
        <p className="text-center text-sm text-stone-500 mt-6">
          Pas encore de compte ?{' '}
          <a href="/inscription" className="text-violet-600 hover:underline">S'inscrire gratuitement</a>
        </p>
      </div>
    </main>
  )
}

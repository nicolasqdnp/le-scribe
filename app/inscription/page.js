'use client'
import { useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function Inscription() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleInscription(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nom } }
    })
    if (error) {
      setMessage('Erreur : ' + error.message)
    } else {
      setMessage('Vérifie ta boîte mail pour confirmer ton inscription !')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl">✍️</span>
          <h1 className="text-2xl font-bold text-stone-900 mt-2">Créer ton compte</h1>
          <p className="text-stone-500 text-sm mt-1">Premier chapitre gratuit — sans carte bancaire</p>
        </div>
        <form onSubmit={handleInscription} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Ton prénom et nom</label>
            <input
              type="text"
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Jean Dupont"
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
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
              placeholder="8 caractères minimum"
              required
              minLength={8}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {message && (
            <div className={`text-sm p-3 rounded-lg ${message.startsWith('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-3 rounded-lg font-medium hover:bg-violet-700 transition disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : 'Créer mon compte →'}
          </button>
        </form>
        <p className="text-center text-sm text-stone-500 mt-6">
          Déjà un compte ?{' '}
          <a href="/login" className="text-violet-600 hover:underline">Se connecter</a>
        </p>
      </div>
    </main>
  )
}

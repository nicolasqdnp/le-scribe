'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center">
      <p className="text-stone-400">Chargement...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✍️</span>
          <span className="text-xl font-semibold text-stone-800">Le Scribe</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-stone-500">{user?.user_metadata?.nom || user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-stone-500 hover:text-stone-800">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          Bonjour {user?.user_metadata?.nom?.split(' ')[0] || 'Auteur'} 👋
        </h1>
        <p className="text-stone-500 mb-10">Que veux-tu faire aujourd'hui ?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/profil" className="block p-6 bg-white rounded-2xl border border-stone-200 hover:border-violet-400 transition group">
            <div className="text-3xl mb-4">👤</div>
            <h2 className="text-lg font-semibold text-stone-800 mb-2 group-hover:text-violet-600">Mon profil auteur</h2>
            <p className="text-sm text-stone-500">Configure ton style d'auteur et tes préférences d'écriture.</p>
          </a>

          <a href="/nouveau-livre" className="block p-6 bg-violet-600 rounded-2xl border border-violet-600 hover:bg-violet-700 transition group">
            <div className="text-3xl mb-4">📖</div>
            <h2 className="text-lg font-semibold text-white mb-2">Nouveau livre</h2>
            <p className="text-sm text-violet-200">Démarre un nouveau projet et génère ton premier chapitre.</p>
          </a>

          <div className="p-6 bg-white rounded-2xl border border-stone-200 md:col-span-2">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">Mes livres en cours</h2>
            <div className="text-center py-8 text-stone-400">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-sm">Aucun livre pour le moment.</p>
              <a href="/nouveau-livre" className="inline-block mt-4 text-sm text-violet-600 hover:underline">
                Commencer mon premier livre →
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

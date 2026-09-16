'use client'
import { useState, useRef, useEffect } from 'react'

function formatTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MonAudiobook() {
  const [email, setEmail]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [url, setUrl]               = useState(null)
  const [chapters, setChapters]     = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [playing, setPlaying]       = useState(false)
  const [activeChapter, setActiveChapter] = useState(0)
  const audioRef = useRef(null)
  const chapListRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/audiobook-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      if (!data.url) {
        setError('Aucun achat audiobook trouvé pour cet email. Si vous venez d\'acheter, réessayez dans quelques secondes.')
        return
      }
      setUrl(data.url)
      setChapters(data.chapters || [])
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!audioRef.current || !chapters.length) return
    const idx = [...chapters].reverse().findIndex(c => currentTime >= c.start)
    if (idx !== -1) {
      const chIdx = chapters.length - 1 - idx
      if (chIdx !== activeChapter) setActiveChapter(chIdx)
    }
  }, [currentTime, chapters])

  function seekToChapter(ch) {
    if (!audioRef.current) return
    audioRef.current.currentTime = ch.start
    audioRef.current.play()
    setPlaying(true)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  function seek(e) {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = ratio * duration
  }

  const s = {
    page: { background: '#0d0c0a', minHeight: '100vh', color: '#e8e0d0', fontFamily: 'Georgia, serif', padding: '0' },
    wrap: { maxWidth: '640px', margin: '0 auto', padding: '48px 24px 80px' },
    logo: { fontSize: '20px', fontWeight: 'bold', color: '#c9a77d', marginBottom: '40px', display: 'block', textDecoration: 'none' },
    card: { background: '#1a1814', border: '1px solid #2a2520', borderRadius: '20px', padding: '36px' },
    label: { fontSize: '12px', fontWeight: 'bold', color: '#c9a77d', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px', display: 'block' },
    h1: { fontSize: '24px', fontWeight: 'bold', color: '#f0ead8', margin: '0 0 8px', lineHeight: 1.3 },
    sub: { fontSize: '14px', color: '#7a6a50', margin: '0 0 28px' },
    input: { width: '100%', boxSizing: 'border-box', background: '#13120f', border: '1px solid #3a3228', borderRadius: '10px', padding: '14px 16px', fontSize: '15px', color: '#e8e0d0', outline: 'none', marginBottom: '12px' },
    btn: { width: '100%', background: '#c9a77d', color: '#0d0c0a', fontWeight: 'bold', fontSize: '15px', padding: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' },
    err: { color: '#c0392b', fontSize: '14px', marginBottom: '12px' },
  }

  if (!url) {
    return (
      <main style={s.page}>
        <div style={s.wrap}>
          <a href="/" style={s.logo}>Le Scribe</a>
          <div style={s.card}>
            <span style={s.label}>Mon audiobook</span>
            <h1 style={s.h1}>L'urgence des temps</h1>
            <p style={s.sub}>Entrez l'email utilisé lors de votre achat pour accéder à votre audiobook.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="email" required
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={s.input}
              />
              {error && <p style={s.err}>{error}</p>}
              <button type="submit" disabled={loading} style={s.btn}>
                {loading ? 'Vérification…' : 'Accéder à mon audiobook →'}
              </button>
            </form>
            <p style={{ marginTop: '20px', fontSize: '13px', color: '#5a4a38', textAlign: 'center' }}>
              Vous n'avez pas encore l'audiobook ?{' '}
              <a href="/boutique/audiobook" style={{ color: '#c9a77d', textDecoration: 'none' }}>L'acheter →</a>
            </p>
          </div>
        </div>
      </main>
    )
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <a href="/" style={s.logo}>Le Scribe</a>

        {/* Lecteur fixe */}
        <div style={{ background: '#1a1814', border: '1px solid #2a2520', borderRadius: '20px', padding: '28px 28px 24px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#c9a77d', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            L'urgence des temps · Nicolas Salafranque
          </p>
          <p style={{ fontSize: '16px', color: '#f0ead8', margin: '0 0 20px', fontWeight: 'bold' }}>
            {chapters[activeChapter]?.title || ''}
          </p>

          {/* Barre de progression */}
          <div
            onClick={seek}
            style={{ height: '6px', background: '#2a2520', borderRadius: '3px', cursor: 'pointer', marginBottom: '8px', position: 'relative' }}
          >
            <div style={{ width: `${progress}%`, height: '100%', background: '#c9a77d', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5a4a38', marginBottom: '20px' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Contrôles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <button
              onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 30 }}
              style={{ background: 'none', border: '1px solid #3a3228', borderRadius: '8px', color: '#a09070', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}
            >−30s</button>
            <button
              onClick={togglePlay}
              style={{ flex: 1, background: '#c9a77d', color: '#0d0c0a', fontWeight: 'bold', fontSize: '16px', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
            >
              {playing ? '⏸ Pause' : '▶ Écouter'}
            </button>
            <button
              onClick={() => { if (audioRef.current) audioRef.current.currentTime += 30 }}
              style={{ background: 'none', border: '1px solid #3a3228', borderRadius: '8px', color: '#a09070', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' }}
            >+30s</button>
          </div>

          {/* Téléchargement */}
          <a
            href={url}
            download="lurgence-des-temps.m4b"
            style={{ display: 'block', textAlign: 'center', background: '#13120f', border: '1px solid #3a3228', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#c9a77d', textDecoration: 'none' }}
          >
            ⬇ Télécharger (M4B · 45 Mo)
          </a>
          <p style={{ fontSize: '11px', color: '#3a3228', textAlign: 'center', margin: '8px 0 0' }}>
            Format M4B · Compatible iPhone, Mac, VLC, et toutes les apps audio
          </p>

          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
            onEnded={() => setPlaying(false)}
            preload="metadata"
            style={{ display: 'none' }}
          />
        </div>

        {/* Liste des chapitres */}
        <div style={{ background: '#1a1814', border: '1px solid #2a2520', borderRadius: '20px', overflow: 'hidden' }} ref={chapListRef}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#c9a77d', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '20px 24px 12px', margin: 0, borderBottom: '1px solid #2a2520' }}>
            Chapitres ({chapters.length})
          </p>
          {chapters.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => seekToChapter(ch)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                width: '100%', textAlign: 'left', background: i === activeChapter ? '#1f1c16' : 'none',
                border: 'none', borderBottom: '1px solid #1f1c16', padding: '14px 24px',
                cursor: 'pointer', color: i === activeChapter ? '#c9a77d' : '#a09070',
              }}
            >
              <span style={{ fontSize: '11px', minWidth: '36px', color: '#5a4a38' }}>{formatTime(ch.start)}</span>
              <span style={{ fontSize: '14px', flex: 1, lineHeight: 1.4 }}>{ch.title}</span>
              {i === activeChapter && <span style={{ fontSize: '11px', color: '#c9a77d' }}>▶</span>}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

'use client'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from './ThemeProvider'

const OPTIONS = [
  { value: 'system', label: 'Identique à l\'appareil', icon: '💻' },
  { value: 'light',  label: 'Clair',                   icon: '☀️' },
  { value: 'dark',   label: 'Sombre',                  icon: '🌙' },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = OPTIONS.find(o => o.value === theme) || OPTIONS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center text-muted hover:text-cream border border-border rounded-lg p-2 transition hover:border-gold/30"
        title={current.label}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-surface border border-border rounded-xl shadow-2xl py-1 w-48 z-50">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setTheme(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left
                ${theme === opt.value
                  ? 'text-gold bg-gold/5'
                  : 'text-muted hover:text-cream hover:bg-surface2'
                }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              {theme === opt.value && <span className="ml-auto text-gold text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

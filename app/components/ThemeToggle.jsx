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
        className="flex items-center gap-1.5 text-xs text-muted hover:text-cream border border-border rounded-lg px-3 py-1.5 transition hover:border-gold/30"
        title="Apparence"
      >
        <span>{current.icon}</span>
        <span className="hidden sm:inline">{current.label}</span>
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

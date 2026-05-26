'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'system', setTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system')

  function applyTheme(t) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = t === 'dark' || (t === 'system' && prefersDark)
    document.documentElement.classList.toggle('light', !useDark)
  }

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    setThemeState(saved)
    applyTheme(saved)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const current = localStorage.getItem('theme') || 'system'
      if (current === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function setTheme(t) {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

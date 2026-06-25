'use client'

import { useState } from 'react'
import ThemeToggle from './ThemeToggle'

export default function HeaderNav() {
  const [open, setOpen] = useState(false)

  const links = [
    { href: '#comment', label: 'Comment ça marche', style: 'muted' },
    { href: '#tarifs', label: 'Tarifs', style: 'muted' },
    { href: '/boutique', label: 'Boutique', style: 'gold' },
    { href: '/soutenir', label: 'Soutenir le projet', style: 'gold' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <img src="/lescribe-logo-fond-sombre.png" alt="Le Scribe" className="logo-nav-dark h-8 w-auto" />
          <img src="/lescribe-logo-fond-clair.png" alt="Le Scribe" className="logo-nav-light h-8 w-auto" />
        </a>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, style }) => (
            <a
              key={href}
              href={href}
              className={`text-sm px-4 py-2 rounded-lg hover:bg-surface transition ${
                style === 'gold' ? 'text-gold hover:text-gold2' : 'text-muted hover:text-cream'
              }`}
            >
              {label}
            </a>
          ))}
          <a href="#tutos" className="text-sm text-muted2 hover:text-muted px-4 py-2 rounded-lg transition flex items-center gap-1.5">
            Tutos
            <span className="text-[10px] bg-surface2 text-muted2 border border-border px-1.5 py-0.5 rounded-full">Bientôt</span>
          </a>
        </nav>

        {/* Actions desktop + hamburger mobile */}
        <div className="flex gap-2 items-center">
          <a href="/login" className="hidden md:block text-sm text-muted hover:text-cream px-4 py-2 transition">Connexion</a>
          <a href="/inscription" className="text-sm bg-gold text-bg font-medium px-5 py-2 rounded-lg hover:bg-gold2 transition">
            Commencer
          </a>
          <ThemeToggle />
          {/* Hamburger */}
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-surface transition gap-[5px]"
          >
            <span className={`block w-5 h-0.5 bg-cream transition-all duration-200 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-5 h-0.5 bg-cream transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-cream transition-all duration-200 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {open && (
        <div className="md:hidden border-t border-border bg-bg/95 backdrop-blur-sm px-6 py-4 flex flex-col gap-1">
          {links.map(({ href, label, style }) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`text-sm px-4 py-3 rounded-lg hover:bg-surface transition ${
                style === 'gold' ? 'text-gold' : 'text-muted hover:text-cream'
              }`}
            >
              {label}
            </a>
          ))}
          <a
            href="#tutos"
            onClick={() => setOpen(false)}
            className="text-sm text-muted2 px-4 py-3 rounded-lg transition flex items-center gap-2"
          >
            Tutos
            <span className="text-[10px] bg-surface2 text-muted2 border border-border px-1.5 py-0.5 rounded-full">Bientôt</span>
          </a>
          <div className="h-px bg-border my-1" />
          <a href="/login" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-cream px-4 py-3 rounded-lg hover:bg-surface transition">
            Connexion
          </a>
        </div>
      )}
    </header>
  )
}

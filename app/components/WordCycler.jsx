'use client'
import { useState, useEffect } from 'react'

const WORDS = ['prédications', 'messages', 'podcasts', 'enseignements', 'notes']

export default function WordCycler() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('visible') // 'visible' | 'out' | 'in'

  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Fade out + slide up
      setPhase('out')
      setTimeout(() => {
        // 2. Change word, position below
        setIndex(i => (i + 1) % WORDS.length)
        setPhase('in')
        // 3. Fade in
        setTimeout(() => setPhase('visible'), 50)
      }, 300)
    }, 2200)

    return () => clearInterval(interval)
  }, [])

  const styles = {
    visible: { opacity: 1, transform: 'translateY(0px)' },
    out:     { opacity: 0, transform: 'translateY(-10px)' },
    in:      { opacity: 0, transform: 'translateY(12px)' },
  }

  return (
    <span
      style={{
        display: 'inline-block',
        transition: phase === 'in' ? 'none' : 'opacity 0.3s ease, transform 0.3s ease',
        ...styles[phase],
      }}
    >
      {WORDS[index]}
    </span>
  )
}

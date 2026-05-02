'use client'
import { useState } from 'react'

export default function Test() {
  const [count, setCount] = useState(0)
  return (
    <div style={{padding: '2rem'}}>
      <p>Compteur : {count}</p>
      <button onClick={() => setCount(count + 1)} style={{padding: '1rem', background: 'violet', color: 'white', borderRadius: '8px'}}>
        Cliquer ici
      </button>
    </div>
  )
}

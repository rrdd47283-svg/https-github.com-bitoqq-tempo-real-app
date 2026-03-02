import React from 'react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>Tempo Moderato • Chain ID: 42431</p>
        <div className="footer-links">
          <a href="https://docs.tempo.xyz" target="_blank" rel="noopener noreferrer">Docs</a>
          <a href="https://explore.tempo.xyz" target="_blank" rel="noopener noreferrer">Explorer</a>
          <a href="https://x.com/rdikqq" target="_blank" rel="noopener noreferrer">𝕏</a> {/* Заменили Faucet на Twitter/X */}
        </div>
      </div>
    </footer>
  )
}
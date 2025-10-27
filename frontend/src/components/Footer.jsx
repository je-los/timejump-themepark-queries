import React from 'react'

export default function Footer(){
  return (
    <footer style={{background:'#0d0d0d', borderTop:'1px solid rgba(255,255,255,.06)'}}>
      <div className="container" style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr', gap:20, padding:'28px 0'}}>
        <div>
          <div style={{fontSize:'1.4rem', fontWeight:800, marginBottom:8}}>TimeJump</div>
          <p style={{color:'var(--muted)'}}>Thrills. Shows. Memories. © {new Date().getFullYear()}</p>
        </div>
        <div>
          <strong>Plan</strong>
          <ul style={{listStyle:'none',padding:0,margin:'8px 0 0', lineHeight:'28px'}}>
            <li><a href="/tickets">Tickets</a></li>
            <li><a href="/parking">Parking</a></li>
            <li><a href="/attractions">Attractions</a></li>
          </ul>
        </div>
        <div>
          <strong>Park Info</strong>
          <ul style={{listStyle:'none',padding:0,margin:'8px 0 0', lineHeight:'28px'}}>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/hours">Hours</a></li>
            <li><a href="/policies">Park Policies</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

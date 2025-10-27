import React from 'react'

export default function TicketsCTA(){
  return (
    <section className="section" style={{background:'#111'}}>
      <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between', gap:24}}>
        <div>
          <h2 style={{margin:'0 0 6px'}}>Tickets & Passes</h2>
          <p style={{margin:0, color:'var(--muted)'}}>Buy now and save—skip the line at the gate.</p>
    </div>
        <div style={{display:'flex',gap:12}}>
          <a className="btn btn-primary" href="/tickets">Buy Tickets</a>
          <a className="btn btn-ghost" href="/tickets">Season Passes</a>
        </div>
      </div>
    </section>
  )
}

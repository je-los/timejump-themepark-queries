import React from 'react'

const events = [
  {img:'/assets/events/fireworks.jpg', title:'Fireworks Nights', date:'Fridays in July'},
  {img:'/assets/events/fright.jpg',    title:'Fright Fest',      date:'Oct 1 - Oct 31'},
  {img:'/assets/events/holiday.jpg',   title:'Holiday in the Park', date:'Nov - Dec'},
  {img:'/assets/events/concert.jpg',   title:'Concert Series',   date:'All Summer'},
]

export default function EventsStrip(){
  return (
    <section className="section" style={{background:'#0f0f0f'}}>
      <div className="container">
        <h2>Events & Entertainment</h2>
        <div className="scroller">
          {events.map((e,i)=>(
            <div key={i} className="card" style={{minWidth:280}}>
              <img src={e.img} alt={e.title} style={{width:'100%',height:160,objectFit:'cover'}}/>
              <div style={{padding:14}}>
                <div className="badge" style={{marginBottom:8}}>{e.date}</div>
                <h3 style={{margin:'0 0 6px'}}>{e.title}</h3>
                <p style={{margin:0, color:'var(--muted)'}}>Details & showtimes</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import React from 'react'

const tiles = [
  {img:'/assets/promos/offers.jpg', title:'Special Offers', text:'Limited-time discounts & bundles', href:'/tickets'},
  {img:'/assets/promos/dining.jpg', title:'Dining & Add-Ons', text:'Parking, dining, flash pass & more', href:'/tickets'},
  {img:'/assets/promos/plan.jpg',   title:'Plan Your Visit', text:'Hours, directions, park map', href:'/parking'},
]

export default function OfferTiles(){
  return (
    <section className="section">
      <div className="container">
        <h2>Make the Most of Your Day</h2>
        <div className="grid-3">
          {tiles.map((t,i)=>(
            <a className="card" key={i} href={t.href} style={{display:'block'}}>
              <img src={t.img} alt={t.title} style={{width:'100%',height:180,objectFit:'cover'}}/>
              <div style={{padding:16}}>
                <h3 style={{margin:'0 0 6px'}}>{t.title}</h3>
                <p style={{margin:0, color:'var(--muted)'}}>{t.text}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

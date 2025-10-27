import React, {useEffect, useRef, useState} from 'react'
import './HeroCarousel.css'

const slides = [
  { img:'/assets/hero/hero-1.jpg', title:'Bigger Thrills. Shorter Lines.', cta:'/tickets' },
  { img:'/assets/hero/hero-2.jpg', title:'New This Season: CHRONO COASTER', cta:'/attractions' },
  { img:'/assets/hero/hero-3.jpg', title:'Night Shows & Fireworks', cta:'/events' },
]

export default function HeroCarousel(){
  const [idx,setIdx]=useState(0)
  const timer = useRef(null)
  useEffect(()=>{
    timer.current=setInterval(()=> setIdx(i=> (i+1)%slides.length ), 4500)
    return ()=> clearInterval(timer.current)
  },[])
  return (
    <section className="hero">
      {slides.map((s,i)=>(
        <div key={i} className={`hero-slide ${i===idx?'active':''}`} style={{backgroundImage:`url(${s.img})`}}>
          <div className="hero-overlay container">
            <span className="badge">Plan Your Trip</span>
            <h1>{s.title}</h1>
            <a className="btn btn-primary" href={s.cta}>Explore</a>
          </div>
        </div>
      ))}
      <div className="dots">
        {slides.map((_,i)=>(
          <button key={i} onClick={()=>setIdx(i)} className={i===idx?'on':''} aria-label={`slide ${i+1}`} />
        ))}
      </div>
    </section>
  )
}

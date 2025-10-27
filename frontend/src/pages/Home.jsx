import React from 'react'
import HeroCarousel from '../components/HeroCarousel'
import TicketsCTA from '../components/TicketsCTA'
import OfferTiles from '../components/OfferTiles'
import EventsStrip from '../components/EventsStrip'

export default function Home(){
  return (
    <>
      <HeroCarousel />
      <TicketsCTA />
      <OfferTiles />
      <EventsStrip />
    </>
  )
}

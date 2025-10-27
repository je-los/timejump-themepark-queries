import React from 'react';
import './HeroBanner.css';

export default function HeroBanner() {
  return (
    <section className="hero-banner">
      <div className="hero-overlay">
        <h1>🎢 Welcome to TimeJump Theme Park</h1>
        <p>Discover the thrill rides, water adventures and fun for all ages.</p>
        <a href="/attractions" className="btn btn-primary">Explore Attractions</a>
      </div>
    </section>
  );
}

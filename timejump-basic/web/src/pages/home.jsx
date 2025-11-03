import React from 'react';

const THEME_CARDS = [
  {
    key: 'jurassic',
    title: 'Jurassic Zone',
    subtitle: 'Primeval thrills with towering coasters and aquatic escapes.',
    href: '/things-to-do/theme/jurassic-zone',
    gradient: 'from-emerald-500 via-lime-400 to-amber-300',
  },
  {
    key: 'medieval',
    title: 'Medieval Fantasy',
    subtitle: 'Dragon-fire adventures and enchanted quests for every hero.',
    href: '/things-to-do/theme/medieval-fantasy-zone',
    gradient: 'from-purple-500 via-indigo-500 to-sky-400',
  },
  {
    key: 'wild-west',
    title: 'Wild West',
    subtitle: 'High-noon showdowns, runaway trains, and frontier flair.',
    href: '/things-to-do/theme/wild-west-zone',
    gradient: 'from-amber-500 via-orange-500 to-rose-400',
  },
  {
    key: 'nova-crest',
    title: 'Nova-Crest',
    subtitle: 'Futuristic spectacles, zero-G simulators, and neon nights.',
    href: '/things-to-do/theme/nova-crest-futuristic-zone',
    gradient: 'from-cyan-500 via-blue-500 to-fuchsia-500',
  },
];

export default function Home({ onNavigate }) {
  function go(path) {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    }
  }

  return (
    <div className="page">
      <section className="home-hero">
        <div className="home-hero__inner">
          <div className="home-hero__badge">Time Jump Theme Park</div>
          <h1>Skip Through Time, One Thrill at a Time CORNYYY.</h1>
          <p>
            Journey from prehistoric jungles to neon skylines in a single day. Discover rides for families,
            adventurers, and thrill seekers—plus dining, shows, and unforgettable souvenirs.
          </p>
          <div className="home-hero__actions">
            <button className="btn primary" onClick={()=>go('Tickets')}>
              Tickets &amp; Passes
            </button>
            <button className="btn" onClick={()=>go('things-to-do/rides-attractions')}>
              Explore Attractions
            </button>
            <button className="btn" onClick={()=>go('ticket-passes/annual-passes')}>
              Annual Passes
            </button>
          </div>
        </div>
        <div className="home-hero__visual">
          <div className="home-hero__placeholder">
            <span>Theme artwork coming soon</span>
          </div>
        </div>
      </section>

      <section className="home-themes">
        <header className="section-header">
          <h2>Choose Your Era</h2>
          <p>Four immersive zones, one destination. Pick a realm to start planning your adventure.</p>
        </header>
        <div className="home-theme-grid">
          {THEME_CARDS.map(card => (
            <button
              key={card.key}
              className={`home-theme-card bg-gradient-to-br ${card.gradient}`}
              onClick={()=>go(`theme/${card.href.split('/').pop()}`)}
            >
              <div className="home-theme-card__content">
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
                <span className="home-theme-card__cta">View experiences</span>
              </div>
              <div className="home-theme-card__overlay">Artwork placeholder</div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-gift-shop">
        <div className="home-gift-shop__content">
          <h2>Bring the Time Jump Magic Home</h2>
          <p>
            From era-inspired apparel to exclusive collectibles, the Time Jump Gift Shop has a treasure for every
            traveler. Preview limited releases and skip the in-park line by adding favorites to your cart ahead of time.
          </p>
          <div className="home-gift-shop__actions">
            <button className="btn primary" onClick={()=>go('GiftShop')}>
              Shop Souvenirs
            </button>
            <button className="btn" onClick={()=>go('FoodVendors')}>
              Plan Snacks &amp; Meals
            </button>
          </div>
        </div>
        <div className="home-gift-shop__visual">
          <div className="home-gift-shop__placeholder">
            <span>Gift shop gallery coming soon</span>
          </div>
        </div>
      </section>
    </div>
  );
}

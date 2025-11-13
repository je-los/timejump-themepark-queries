import React from 'react';
import { useNavigate } from 'react-router-dom';

const THEME_CARDS = [
  {
    key: 'jurassic',
    title: 'Jurassic Zone',
    subtitle: 'Primeval thrills with towering coasters and aquatic escapes.',
    href: '/things-to-do/theme/jurassic-zone',
    gradient: 'from-emerald-500 via-lime-400 to-amber-300',
    extraClass: 'home-theme-card--jurassic',
  },
  {
    key: 'medieval',
    title: 'Medieval Fantasy',
    subtitle: 'Dragon-fire adventures and enchanted quests for every hero.',
    href: '/things-to-do/theme/medieval-fantasy-zone',
    gradient: 'from-purple-500 via-indigo-500 to-sky-400',
    extraClass: 'home-theme-card--medieval',
  },
  {
    key: 'wild-west',
    title: 'Wild West',
    subtitle: 'High-noon showdowns, runaway trains, and frontier flair.',
    href: '/things-to-do/theme/wild-west-zone',
    gradient: 'from-amber-500 via-orange-500 to-rose-400',
    extraClass: 'home-theme-card--wildwest',
  },
  {
    key: 'nova-crest',
    title: 'Nova-Crest',
    subtitle: 'Futuristic spectacles, zero-G simulators, and neon nights.',
    href: '/things-to-do/theme/nova-crest-futuristic-zone',
    gradient: 'from-cyan-500 via-blue-500 to-fuchsia-500',
    extraClass: 'home-theme-card--novacrest',
  },
];

export default function Home() {
  const navigate = useNavigate();

  function go(path) {
    navigate(path);
  }

  return (
    <div className="page home-page">
      <section className="home-hero home-hero--with-bg home-hero--fullbleed">
        <div className="home-hero__container">
          <div className="home-hero__inner">
            <h1>Skip Through Time, One Thrill at a Time.</h1>
            <p>
              Journey from prehistoric jungles to neon skylines in a single day. Discover rides for families,
              adventurers, and thrill seekers—plus dining, shows, and unforgettable souvenirs.
            </p>
            <div className="home-hero__actions">
              <button className="btn primary" onClick={()=>go('/ticket-passes')}>
                Buy Tickets
              </button>
              <button className="btn" onClick={()=>go('/things-to-do/rides-attractions')}>
                Explore Attractions
              </button>
              <button className="btn" onClick={()=>go('/things-to-do/dining')}>
                Marketplace
             </button>
            </div>
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
              className={`home-theme-card bg-gradient-to-br ${card.gradient} ${card.extraClass ?? ''}`}
              onClick={()=>go(`/theme/${card.href.split('/').pop()}`)}
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
            <button className="btn primary" onClick={()=>go('/things-to-do/shopping')}>
              Shop Souvenirs
            </button>
            <button className="btn" onClick={()=>go('/things-to-do/dining')}>
              Plan Snacks &amp; Meals
            </button>
          </div>
        </div>
        <div className="home-gift-shop__visual">
          <div className="home-gift-shop__placeholder" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}

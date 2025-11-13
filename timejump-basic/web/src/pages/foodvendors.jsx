import React, { useEffect, useMemo, useState } from 'react';
import { useCart } from '../context/cartcontext.jsx';

export default function FoodVendors() {
  const { add } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');
  const [activeTheme, setActiveTheme] = useState('all');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/food/items`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load food items');
        if (alive) setItems(Array.isArray(json) ? json : json.items || []);
      } catch (error) {
        if (alive) setErr(error.message || 'Failed to load food items');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const themes = useMemo(() => {
    const set = new Set(items.map(item => item.theme_name || 'Other'));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
      .filter(item => activeTheme === 'all' || (item.theme_name || 'Other') === activeTheme);
  }, [items, query, activeTheme]);

  const sortedItems = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = (a.name || '').localeCompare(b.name || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortDir]);

  return (
    <div className="page dining-page-shell">
      <section className="dining-hero dining-hero--fullbleed">
        <div className="dining-hero__content">
          <p className="dining-eyebrow">Marketplace</p>
          <h1>Dine your way through every era.</h1>
          <p>Filter by land, browse signature bites, and plan your tasting tour before you even scan your ticket.</p>
        </div>
      </section>

      <div className="dining-page">

        <div className="dining-tools">
          <input
            className="input input--compact"
            placeholder="Search menu items..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="dining-filters">
            {themes.map(theme => (
              <button
                key={theme}
                className={`dining-filter ${activeTheme === theme ? 'dining-filter--active' : ''}`}
                onClick={() => setActiveTheme(theme)}
              >
                {theme === 'all' ? 'All Lands' : theme}
              </button>
            ))}
          </div>
        </div>

        <div className="dining-sort-bar">
          <span>Sort by name:</span>
          <div className="dining-sort-buttons">
            <button
              type="button"
              className={`dining-sort-btn ${sortDir === 'asc' ? 'active' : ''}`}
              onClick={() => setSortDir('asc')}
            >
              A-Z
            </button>
            <button
              type="button"
              className={`dining-sort-btn ${sortDir === 'desc' ? 'active' : ''}`}
              onClick={() => setSortDir('desc')}
            >
              Z-A
            </button>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-600">Loading...</div>}
        {err && !loading && <div className="alert error">{err}</div>}
        {!loading && !err && sortedItems.length === 0 && (
          <div className="text-sm text-gray-600">No menu items match that filter.</div>
        )}

        {!loading && !err && sortedItems.length > 0 && (
          <div className="items-grid">
            {sortedItems.map(item => (
              <article key={item.id} className="item-card">
                {item.image_url ? (
                  <div className="item-card__image">
                    <img src={item.image_url} alt={item.name} loading="lazy" />
                  </div>
                ) : (
                  <div className="item-card__image item-card__image--placeholder">Menu preview</div>
                )}
                <div className="item-name">{item.name}</div>
                <div className="item-card__footer">
                  <span className="item-card__price">${Number(item.price || 0).toFixed(2)}</span>
                  <button
                    className="btn item-card__add"
                    onClick={() => add({ kind: 'food', id: item.id, name: item.name, price: item.price })}
                  >
                    Add to Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}





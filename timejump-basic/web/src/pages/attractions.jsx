import React, { useEffect, useState } from 'react';
import { api } from '../auth';

export default function Attractions(){
  const [themes,setThemes] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  useEffect(()=>{
    let active = true;
    setLoading(true);
    setError('');
    api('/themes')
      .then(res=>{
        if (!active) return;
        const items = Array.isArray(res?.data) ? res.data : [];
        setThemes(items.map(item => ({
          id: item.themeID ?? item.id,
          name: item.name ?? item.themeName,
          description: item.description ?? item.Description ?? '',
        })));
      })
      .catch(err=>{
        if (!active) return;
        setError(err?.message || 'Unable to load themes.');
        setThemes([]);
      })
      .finally(()=>{ if (active) setLoading(false); });
    return ()=>{ active = false; };
  },[]);

  return (
    <div className="page">
      <div className="page-box page-box--wide">
        <h2 className="text-xl font-semibold mb-4">Attractions by Theme</h2>
        {loading && <p className="text-sm text-gray-600">Loading themes…</p>}
        {!loading && error && <p className="alert error">{error}</p>}
        {!loading && !error && themes.length === 0 && (
          <p className="text-sm text-gray-600">No themes available yet. Create themes in the admin catalog to populate this list.</p>
        )}
        {!loading && !error && themes.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4">
            {themes.map(theme => (
              <div key={theme.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-lg font-semibold">{theme.name}</div>
                <div className="text-sm text-gray-600">
                  {theme.description || 'Description coming soon.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

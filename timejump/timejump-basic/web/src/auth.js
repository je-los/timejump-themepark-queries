// Minimal auth helpers + /me probe
const KEY = 'tj_token';

export function setToken(t){ localStorage.setItem(KEY, t); }
export function getToken(){ return localStorage.getItem(KEY); }
export function clearToken(){ localStorage.removeItem(KEY); }

export async function me(){
  const t = getToken(); if(!t) return null;
  try{
    const r = await fetch(import.meta.env.VITE_API_URL + '/me', {
      headers: { Authorization: 'Bearer ' + t }
    });
    if(!r.ok) return null;
    const j = await r.json();
    return j?.me ?? null; // { email, role }
  }catch{ return null; }
}

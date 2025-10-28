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
    // Expected shape from API: { me: { email, role } }
    return j?.me ?? null;
  }catch{ return null; }
}

export async function login(email, password){
  const base = import.meta.env.VITE_API_URL || '';
  const res = await fetch(base + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if(!res.ok) throw new Error('Invalid credentials');
  const j = await res.json();
  if (j?.token) setToken(j.token);
  return j;
}

// Simple API helper with auth header
export async function api(path, opts={}){
  const t = getToken();
  const base = import.meta.env.VITE_API_URL || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers||{}),
    ...(t ? { Authorization: 'Bearer ' + t } : {}),
  };
  const res = await fetch(base + path, { ...opts, headers });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
  if (!res.ok) {
    const err = new Error(json?.error || 'Request failed');
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// Minimal auth helpers + /me probe
const KEY = 'tj_token';

export function setToken(t){ localStorage.setItem(KEY, t); }
export function getToken(){ return localStorage.getItem(KEY); }
export function clearToken(){ localStorage.removeItem(KEY); }

async function readJson(res){
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export async function me(){
  const t = getToken(); if(!t) return null;
  try{
    const r = await fetch(import.meta.env.VITE_API_URL + '/me', {
      headers: { Authorization: 'Bearer ' + t }
    });
    if(!r.ok) return null;
    const j = await r.json();
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
  const j = await readJson(res);
  if(!res.ok) throw new Error(j?.message || j?.error || 'Invalid credentials');
  if (j?.token) setToken(j.token);
  return j;
}

export async function signup(details = {}){
  const {
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    phone,
  } = details;
  const base = import.meta.env.VITE_API_URL || '';
  const res = await fetch(base + '/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      phone,
    })
  });
  const j = await readJson(res);
  if(!res.ok) throw new Error(j?.message || j?.error || 'Unable to create account');
  if (j?.token) setToken(j.token);
  return j;
}

export async function api(path, opts={}){
  const t = getToken();
  const base = import.meta.env.VITE_API_URL || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers||{}),
    ...(t ? { Authorization: 'Bearer ' + t } : {}),
  };
  const res = await fetch(base + path, { ...opts, headers });
  const json = await readJson(res);
  if (!res.ok) {
    const err = new Error(json?.message || json?.error || 'Request failed');
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

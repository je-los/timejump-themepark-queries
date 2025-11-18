import { useEffect, useState } from 'react';

export const AUTH_TOAST_KEY = 'tj-auth-toast';
const AUTH_TOAST_EVENT = 'tj-auth-toast-event';

const TOAST_COPY = {
  in: { type: 'in', title: "You're signed in", message: 'Signed in successfully.' },
  out: { type: 'out', title: "You're signed out", message: 'Signed out. See you soon!' },
};

export function queueAuthToast(type, options = {}) {
  if (typeof window === 'undefined') return;
  const payload = typeof type === 'string' ? { type, ...options } : type;
  if (!payload?.type) return;
  if (window.sessionStorage) {
    window.sessionStorage.setItem(AUTH_TOAST_KEY, JSON.stringify(payload));
  }
}

export function triggerAuthToast(payload) {
  if (typeof window === 'undefined') return;
  const detail = typeof payload === 'string' ? { type: payload } : payload;
  if (!detail?.type) return;
  window.dispatchEvent(new CustomEvent(AUTH_TOAST_EVENT, { detail }));
}

function consumeAuthToastFlag() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  const value = window.sessionStorage.getItem(AUTH_TOAST_KEY);
  if (!value) return null;
  window.sessionStorage.removeItem(AUTH_TOAST_KEY);
  try {
    return JSON.parse(value);
  } catch (err) {
    return { type: value };
  }
}

function normalizeToast(payload) {
  if (!payload) return null;
  const data = typeof payload === 'string' ? { type: payload } : payload;
  if (!data?.type) return null;
  if (data.type === 'require-signin') {
    const redirectTo = sanitizeRedirect(data.redirectTo);
    return {
      type: 'require-signin',
      title: data.title || 'Sign in required',
      message: data.message || 'Create a free guest account to save items to your cart.',
      actions: data.actions || buildSignInActions(redirectTo),
      persist: true,
    };
  }
  const defaults = TOAST_COPY[data.type];
  if (!defaults) return null;
  return {
    ...defaults,
    title: data.title || defaults.title,
    message: data.message || defaults.message,
    persist: Boolean(data.persist),
  };
}

function sanitizeRedirect(path) {
  if (typeof path !== 'string') return '/';
  return path.startsWith('/') ? path : '/';
}

function buildSignInActions(redirectTo) {
  const searchParams = new URLSearchParams();
  if (redirectTo && redirectTo !== '/') {
    searchParams.set('redirect', redirectTo);
  }
  const loginQuery = searchParams.toString();
  const loginPath = loginQuery ? `/login?${loginQuery}` : '/login';
  const signupParams = new URLSearchParams(searchParams);
  signupParams.set('mode', 'signup');
  const signupPath = `/login?${signupParams.toString()}`;
  return [
    { label: 'Sign In', to: loginPath, primary: true },
    { label: 'Create Account', to: signupPath },
  ];
}

export function useAuthToast(user) {
  const [authToast, setAuthToast] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    function handle(event) {
      const toast = normalizeToast(event.detail);
      if (toast) setAuthToast(toast);
    }
    window.addEventListener(AUTH_TOAST_EVENT, handle);
    return () => window.removeEventListener(AUTH_TOAST_EVENT, handle);
  }, []);

  useEffect(() => {
    const flag = consumeAuthToastFlag();
    if (!flag) return;
    const toast = normalizeToast(flag);
    if (toast) setAuthToast(toast);
  }, [user]);

  useEffect(() => {
    if (!authToast || authToast.persist) return undefined;
    const id = window.setTimeout(() => setAuthToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [authToast]);

  return {
    authToast,
    dismissToast: () => setAuthToast(null),
  };
}

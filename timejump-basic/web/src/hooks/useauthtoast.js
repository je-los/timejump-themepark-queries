import { useEffect, useState } from 'react';

export const AUTH_TOAST_KEY = 'tj-auth-toast';

export function queueAuthToast(type) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  window.sessionStorage.setItem(AUTH_TOAST_KEY, type);
}

function consumeAuthToastFlag() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  const value = window.sessionStorage.getItem(AUTH_TOAST_KEY);
  if (!value) return null;
  window.sessionStorage.removeItem(AUTH_TOAST_KEY);
  return value;
}

const TOAST_COPY = {
  in: { type: 'in', message: 'Signed in successfully.' },
  out: { type: 'out', message: 'Signed out. See you soon!' },
};

export function useAuthToast(user) {
  const [authToast, setAuthToast] = useState(null);

  useEffect(() => {
    const flag = consumeAuthToastFlag();
    if (!flag || !TOAST_COPY[flag]) return;
    setAuthToast(TOAST_COPY[flag]);
  }, [user]);

  useEffect(() => {
    if (!authToast) return;
    const id = window.setTimeout(() => setAuthToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [authToast]);

  return {
    authToast,
    dismissToast: () => setAuthToast(null),
  };
}

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, clearToken, me } from '../auth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }){
  const fakeRole = (import.meta.env.VITE_DEV_FAKE_ROLE || '').trim();
  const fakeEmail = (import.meta.env.VITE_DEV_FAKE_EMAIL || 'dev@timejump.local').trim() || 'dev@timejump.local';
  const [userState, setUserState] = useState(null);   // { email, role }
  const [loading, setLoading] = useState(true);

  function applyDevUser(){
    const devUser = fakeRole ? { email: fakeEmail, role: fakeRole, isDevMock: true } : null;
    setUserState(devUser);
    setLoading(false);
  }

  const setUser = (next) => {
    setUserState(next);
  };

  async function refresh(){
    if (fakeRole) {
      applyDevUser();
      return;
    }
    setLoading(true);
    try{
      const profile = await me();
      setUserState(profile || null);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    if (fakeRole) {
      applyDevUser();
      return;
    }
    if (getToken()) refresh();
    else setLoading(false);
  },[fakeRole, fakeEmail]);

  function signOut(){
    if (fakeRole) {
      applyDevUser();
      return;
    }
    clearToken();
    setUserState(null);
  }

  const contextValue = useMemo(()=>({
    user: userState,
    actualUser: userState,
    role: userState?.role ?? null,
    actualRole: userState?.role ?? null,
    setUser,
    refresh,
    signOut,
    loading,
  }),[userState, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

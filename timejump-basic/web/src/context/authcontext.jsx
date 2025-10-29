import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, clearToken, me } from '../auth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }){
  const fakeRole = (import.meta.env.VITE_DEV_FAKE_ROLE || '').trim();
  const fakeEmail = (import.meta.env.VITE_DEV_FAKE_EMAIL || 'dev@timejump.local').trim() || 'dev@timejump.local';
  const [userState, setUserState] = useState(null);   // actual user { email, role }
  const [loading, setLoading] = useState(true);
  const [viewRole, setViewRoleState] = useState(null);

  function applyDevUser(){
    const devUser = fakeRole ? { email: fakeEmail, role: fakeRole, isDevMock: true } : null;
    setUserState(devUser);
    setViewRoleState(null);
    setLoading(false);
  }

  const setUser = (next) => {
    setUserState(next);
    setViewRoleState(null);
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
      setViewRoleState(null);
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
    setViewRoleState(null);
  }

  function changeViewRole(role){
    if (!userState) return;
    if (!role || role === userState.role) setViewRoleState(null);
    else setViewRoleState(role);
  }

  const effectiveUser = useMemo(()=>{
    if (!userState) return null;
    const role = viewRole || userState.role;
    return { ...userState, role };
  },[userState, viewRole]);

  const contextValue = useMemo(()=>({
    user: effectiveUser,
    actualUser: userState,
    role: effectiveUser?.role ?? null,
    actualRole: userState?.role ?? null,
    setUser,
    refresh,
    signOut,
    loading,
    viewRole,
    setViewRole: changeViewRole,
    clearViewRole: () => setViewRoleState(null),
    isImpersonating: !!viewRole,
  }),[effectiveUser, userState, loading, viewRole]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, clearToken, me } from '../auth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }){
  const [user, setUser] = useState(null);   // { email, role } | null
  const [loading, setLoading] = useState(true);

  async function refresh(){
    setLoading(true);
    try{ setUser(await me()); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{
    if (getToken()) refresh();
    else setLoading(false);
  },[]);

  function signOut(){
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, refresh, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

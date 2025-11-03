import React from 'react';
import { useAuth } from '../context/authcontext.jsx';

export default function RequireRole({ roles = [], fallback = null, children }){
  const { user } = useAuth();
  const allowed = !!user && roles.includes(user.role);
  if (!allowed) return fallback;
  return <>{children}</>;
}


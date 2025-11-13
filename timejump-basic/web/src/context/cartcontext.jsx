import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useAuth } from './authcontext';
const CartContext = createContext();

function getStorageKey(user) {
  if (!user || !user.id) return null; 
  return `themeParkCart_${user.id}`; 
}
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const { user } = useAuth();
  useEffect(() => {
    localStorage.setItem('themeParkCart', JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    // Check if the user is logged in
    if (user && user.id) {
      const storageKey = getStorageKey(user);
      console.log("User changed, loading cart from key:", storageKey);
      try {
        const savedCart = localStorage.getItem(storageKey);
        if (savedCart) {
          // Found a saved cart for this user
          setItems(JSON.parse(savedCart));
        } else {
          // No saved cart for this user, start empty
          setItems([]);
        }
      } catch (err) {
        console.error('Failed to load user-specific cart', err);
        setItems([]);
      }
    } else {
      // User is logged out
      console.log("User logged out, clearing cart state.");
      setItems([]);
    }
  }, [user]);

  useEffect(() => {
    const storageKey = getStorageKey(user);
    
    // Only save if the user is logged in (i.e., we have a storage key)
    if (storageKey) {
      console.log("Items changed, saving cart to key:", storageKey);
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  }, [items, user])
  function add(item){
    setItems(prev=>{
      let next = prev;
      if (item.kind === 'parking') {
        next = prev.filter(existing => existing.kind !== 'parking');
      }
      const idx = next.findIndex(p=> p.kind===item.kind && p.id===item.id && JSON.stringify(p.meta||{})===JSON.stringify(item.meta||{}));
      if(idx>=0){
        const merged = [...next];
        merged[idx] = { ...merged[idx], qty:(merged[idx].qty||1)+(item.qty||1) };
        return merged;
      }
      return [...next, { qty:1, ...item }];
    });
  }
  function remove(key){ setItems(prev=>prev.filter((_,i)=>i!==key)); }
  function updateQty(key, qty){ setItems(prev=>prev.map((it,i)=> i===key?{...it, qty:Math.max(1,qty)}:it)); }
  function clear(){ setItems([]); }
  const total = useMemo(()=> items.reduce((s,i)=> s + (Number(i.price||0)*Number(i.qty||1)), 0), [items]);
  return <CartContext.Provider value={{ items, add, remove, updateQty, clear, total }}>{children}</CartContext.Provider>;
}
export const useCart = ()=> useContext(CartContext);

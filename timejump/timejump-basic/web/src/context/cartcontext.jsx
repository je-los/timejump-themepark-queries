import React, { createContext, useContext, useMemo, useState } from 'react';
const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // {id, kind, name, price, qty, meta}
  function add(item){
    setItems(prev=>{
      const idx = prev.findIndex(p=> p.kind===item.kind && p.id===item.id && JSON.stringify(p.meta||{})===JSON.stringify(item.meta||{}));
      if(idx>=0){ const next=[...prev]; next[idx]={...next[idx], qty:(next[idx].qty||1)+(item.qty||1)}; return next; }
      return [...prev, { qty:1, ...item }];
    });
  }
  function remove(key){ setItems(prev=>prev.filter((_,i)=>i!==key)); }
  function updateQty(key, qty){ setItems(prev=>prev.map((it,i)=> i===key?{...it, qty:Math.max(1,qty)}:it)); }
  function clear(){ setItems([]); }
  const total = useMemo(()=> items.reduce((s,i)=> s + (Number(i.price||0)*Number(i.qty||1)), 0), [items]);
  return <CartContext.Provider value={{ items, add, remove, updateQty, clear, total }}>{children}</CartContext.Provider>;
}
export const useCart = ()=> useContext(CartContext);
